import React, { Suspense } from 'react'
import ReactDOM from 'react-dom'
import { Canvas } from 'react-three-fiber'
import { OrbitControls } from 'drei'
import Particles from './Particles'
import './styles.css'

ReactDOM.render(
  <Canvas
    pixelRatio={Math.min(2, devicePixelRatio)}
    gl={{ antialias: false }}
    camera={{ fov: 80, position: [0, 0, 3] }}
    onCreated={({ gl }) => {
      gl.setClearColor(0x222222)
    }}>
    <Suspense fallback={null}>
      <Particles />
    </Suspense>
    <OrbitControls />
  </Canvas>,
  document.getElementById('root')
)
