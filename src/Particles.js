import React, { useRef, useMemo, useEffect } from 'react'
import useFbo from './Fbo'
import { extend, useFrame, useLoader, useThree, useUpdate } from 'react-three-fiber'
import {
  ShaderMaterial,
  AdditiveBlending,
  BufferGeometry,
  BufferAttribute,
  WebGLRenderTarget,
  NearestFilter,
  RGBAFormat,
  LinearFilter,
  Mesh,
  IcosahedronBufferGeometry,
  MeshBasicMaterial,
  TextureLoader,
  DoubleSide,
  BackSide,
  RepeatWrapping,
  PlaneGeometry
} from 'three'
import distribute from './distribute'

const planeGeometry = new PlaneGeometry(1, 1, 8, 8)
const BUFFER_SIZE = Math.sqrt(planeGeometry.vertices.length)
const dummyMesh = new Mesh(planeGeometry, new MeshBasicMaterial())

function getRandomPoints(points) {
  var vertices = new Float32Array(points.length * 3)

  for (var i = 0; i < points.length; i++) {
    var i3 = i * 3
    vertices[i3] = points[i3]
    vertices[i3 + 1] = points[i3 + 1]
    vertices[i3 + 2] = points[i3 + 2]
  }

  return vertices
}

// function getRandomPoints(count) {
//   var vertices = new Float32Array(count * 3)

//   for (var i = 0; i < count; i++) {
//     var i3 = i * 3
//     var p = planeGeometry.vertices[i]
//     vertices[i3] = p.x
//     vertices[i3 + 1] = p.y
//     vertices[i3 + 2] = p.z
//   }

//   return vertices
// }

const meshPoints = distribute(dummyMesh, BUFFER_SIZE * BUFFER_SIZE)
const data = getRandomPoints(meshPoints.pos)
// const data = getRandomPoints(planeGeometry.vertices.length)

class RenderShaderMaterial extends ShaderMaterial {
  constructor(props) {
    super({
      vertexShader: `
        uniform sampler2D positions;
        uniform sampler2D origin;
        uniform float pointSize;
        varying float a;
        varying vec2 vUv;

        void main() {
            vec4 col = texture2D( positions, position.xy );
            vec4 orig = texture2D( origin, position.xy );
            a = col.a;
            vec3 pos = col.xyz;
            vUv = 0.5+orig.xy*0.5;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
            gl_PointSize = pointSize;
        }
        `,
      fragmentShader: `
        uniform sampler2D positions;
        uniform sampler2D map;
        uniform vec2 resolution;
        varying vec2 vUv;
        varying float a;

        void main() {
          vec2 uv = vUv;
          // uv.x = mod(uv.x, 0.1);
          vec3 rgb = texture2D(map, uv.xy).rgb;
          //vec3 rgb = vec3(1.0, 0.0, 0.0);
          gl_FragColor = vec4(vec3(rgb), .65);
        }
        `,
      uniforms: {
        positions: { type: 't', value: null },
        origin: { type: 't', value: null },
        pointSize: { type: 'f', value: 3 },
        resolution: { value: [window.innerWidth, window.innerHeight] },
        map: { value: 't' }
      },
      transparent: true,
      side: BackSide
      // blending: MultiplyBlending
    })
  }
}

extend({ RenderShaderMaterial })

export default function FboParticles() {
  const points = useRef()
  const quadMesh = useRef()
  const map = useLoader(TextureLoader, '/art2.jpg')

  const { gl, viewport, size, scene, camera } = useThree()

  const { api: fbo, renderTarget } = useFbo({
    width: BUFFER_SIZE,
    height: BUFFER_SIZE,
    data
  })

  let backgroundFbo = useMemo(
    () =>
      new WebGLRenderTarget(size.width, size.height, {
        minFilter: LinearFilter,
        magFilter: NearestFilter,
        format: RGBAFormat
      }),
    [size]
  )

  let screenFbo = useMemo(
    () =>
      new WebGLRenderTarget(size.width, size.height, {
        minFilter: LinearFilter,
        magFilter: NearestFilter,
        format: RGBAFormat
      }),
    [size]
  )

  const particlesGeometry = useMemo(() => {
    const temp = new BufferGeometry()
    temp.setAttribute('position', new BufferAttribute(data, 3))
    return temp
  }, [])

  // const screenMaterial = useMemo(() => new ScreenShaderMaterial(), [])

  let swap = true
  let background = backgroundFbo
  let screen = screenFbo
  let frame = 0
  useFrame(({ clock }) => {
    points.current.material.uniforms.positions.value = renderTarget[0].texture
    if (frame === 0) points.current.material.uniforms.origin.value = renderTarget[0].texture
    // update particles positions
    fbo.update(swap, { renderer: gl, time: clock.getElapsedTime() })

    let temp = background
    background = screen
    screen = temp
    frame += 1
  })

  return (
    <group>
      <mesh ref={points} scale={[1, 1, 1]}>
        <primitive object={particlesGeometry} attach="geometry" />
        <renderShaderMaterial uniforms-map-value={map} attach="material" />
      </mesh>
    </group>
  )
}
