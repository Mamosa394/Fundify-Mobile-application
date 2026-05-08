// src/components/three/NeuralCore.js

import React, {
  useMemo,
  useRef,
} from 'react';

import { Canvas, useFrame } from '@react-three/fiber/native';

import {
  Sphere,
  MeshDistortMaterial,
  Float,
  Trail,
  Line,
} from '@react-three/drei/native';

import * as THREE from 'three';

function Core({
  color,
  speed = 1,
}) {
  const group = useRef();

  const ring1 = useRef();
  const ring2 = useRef();

  const particles = useMemo(() => {
    return new Array(40)
      .fill(0)
      .map(() => ({
        position: [
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
        ],
      }));
  }, []);

  useFrame((state) => {
    const t =
      state.clock.getElapsedTime();

    if (group.current) {
      group.current.rotation.y =
        t * 0.18 * speed;

      group.current.rotation.x =
        Math.sin(t * 0.2) * 0.15;
    }

    if (ring1.current) {
      ring1.current.rotation.x =
        t * 0.5 * speed;

      ring1.current.rotation.z =
        t * 0.3;
    }

    if (ring2.current) {
      ring2.current.rotation.y =
        -t * 0.4 * speed;

      ring2.current.rotation.x =
        t * 0.15;
    }
  });

  return (
    <group ref={group}>
      {/* CENTER CORE */}

      <Float
        speed={3}
        rotationIntensity={0.4}
        floatIntensity={1.8}
      >
        <Sphere args={[1.1, 64, 64]}>
          <MeshDistortMaterial
            color={color}
            distort={0.35}
            speed={2}
            roughness={0}
            metalness={0.6}
          />
        </Sphere>
      </Float>

      {/* INNER GLOW */}

      <Sphere args={[1.45, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
        />
      </Sphere>

      {/* OUTER ORBIT */}

      <mesh ref={ring1}>
        <torusGeometry
          args={[2.4, 0.03, 16, 100]}
        />

        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* SECOND ORBIT */}

      <mesh
        ref={ring2}
        rotation={[1.2, 0.4, 0]}
      >
        <torusGeometry
          args={[3.2, 0.025, 16, 100]}
        />

        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* ENERGY TRAILS */}

      <Trail
        width={0.4}
        color={new THREE.Color(color)}
        length={5}
        decay={2}
        attenuation={(t) => t * t}
      >
        <mesh position={[2.4, 0, 0]}>
          <sphereGeometry
            args={[0.08, 16, 16]}
          />

          <meshBasicMaterial
            color={color}
          />
        </mesh>
      </Trail>

      {/* PARTICLES */}

      {particles.map((p, i) => (
        <mesh
          key={i}
          position={p.position}
        >
          <sphereGeometry
            args={[0.04, 8, 8]}
          />

          <meshBasicMaterial
            color={color}
          />
        </mesh>
      ))}

      {/* ENERGY CONNECTIONS */}

      <Line
        points={[
          [-2, 0, 0],
          [0, 1.2, 0],
          [2, 0, 0],
        ]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.35}
      />

      <Line
        points={[
          [0, -2, 0],
          [0.8, 0, 1],
          [0, 2, 0],
        ]}
        color="#ffffff"
        lineWidth={0.5}
        transparent
        opacity={0.15}
      />
    </group>
  );
}

export default function NeuralCore({
  mode = 'financial',

  budgetProgress = 0.5,

  scholarshipUrgency = 0.5,

  academicRisk = 0.5,

  engagement = 0.5,
}) {
  const config = {
    financial: {
      color: '#7DD3FC',
      speed: 0.8,
    },

    academic: {
      color: '#C4B5FD',
      speed: 1.1,
    },

    scholarship: {
      color: '#F9A8D4',
      speed: 1.4,
    },

    engagement: {
      color: '#86EFAC',
      speed: 1.8,
    },
  };

  const active =
    config[mode] ||
    config.financial;

  return (
    <Canvas camera={{ position: [0, 0, 8] }}>
      {/* LIGHTING */}

      <ambientLight intensity={0.5} />

      <pointLight
        position={[4, 4, 4]}
        intensity={2}
        color={active.color}
      />

      <pointLight
        position={[-4, -4, -2]}
        intensity={1}
        color="#ffffff"
      />

      <fog
        attach="fog"
        args={['#050505', 8, 18]}
      />

      {/* CORE */}

      <Core
        color={active.color}
        speed={active.speed}
      />
    </Canvas>
  );
}