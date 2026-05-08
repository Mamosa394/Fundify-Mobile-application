// components/three/BudgetGalaxy.js

import React, {
  useMemo,
  useRef,
} from 'react';

import {
  View,
  StyleSheet,
} from 'react-native';

import {
  Canvas,
  useFrame,
} from '@react-three/fiber/native';

import * as THREE from 'three';

/* =========================================================
   SAFE HELPERS
========================================================= */

function safeNumber(value, fallback = 0) {
  const num = Number(value);

  return Number.isFinite(num)
    ? num
    : fallback;
}

function safeColor(
  value,
  fallback
) {
  if (
    typeof value !== 'string'
  ) {
    return fallback;
  }

  return value;
}

/* =========================================================
   PARTICLES
========================================================= */

function ParticleField({
  radius = 2.5,
  count = 100,
  color = '#ffffff',
  speed = 0.1,
  size = 0.02,
  tilt = 0,
}) {
  const ref = useRef();

  const positions = useMemo(() => {
    const arr = [];

    for (let i = 0; i < count; i++) {
      const angle =
        (i / count) *
        Math.PI *
        2;

      const r =
        radius +
        (Math.random() - 0.5) *
          0.2;

      arr.push(
        Math.cos(angle) * r,
        (Math.random() - 0.5) *
          0.15,
        Math.sin(angle) * r
      );
    }

    return new Float32Array(arr);
  }, [radius, count]);

  useFrame((state) => {
    if (!ref.current) return;

    ref.current.rotation.y =
      state.clock.getElapsedTime() *
      speed;

    ref.current.rotation.z =
      tilt;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={
            positions.length / 3
          }
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        color={safeColor(
          color,
          '#ffffff'
        )}
        size={size}
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
  );
}

/* =========================================================
   FLOATING NODE
========================================================= */

function FloatingNode({
  position = [0, 0, 0],
  color = '#ffffff',
  scale = 0.15,
  speed = 1,
}) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;

    const t =
      state.clock.getElapsedTime();

    ref.current.position.y =
      position[1] +
      Math.sin(t * speed) *
        0.1;

    ref.current.rotation.y =
      t * 0.7;
  });

  return (
    <mesh
      ref={ref}
      position={position}
      scale={scale}
    >
      <sphereGeometry
        args={[1, 24, 24]}
      />

      <meshStandardMaterial
        color={safeColor(
          color,
          '#ffffff'
        )}
        emissive={safeColor(
          color,
          '#ffffff'
        )}
        emissiveIntensity={0.45}
        roughness={0.25}
        metalness={0.6}
      />
    </mesh>
  );
}

/* =========================================================
   MAIN SCENE
========================================================= */

function Scene(props) {
  const group = useRef();

  const mode =
    props?.mode ||
    'financial';

  const budgetProgress =
    safeNumber(
      props?.budgetProgress
    );

  const scholarshipUrgency =
    safeNumber(
      props?.scholarshipUrgency
    );

  const academicRisk =
    safeNumber(
      props?.academicRisk
    );

  const engagement =
    safeNumber(
      props?.engagement
    );

  const palette = useMemo(() => {
    const palettes = {
      financial: {
        primary: '#708390',
        secondary: '#D6DDE2',
        glow: '#AAB8C2',
        background: '#16232D',
      },

      academic: {
        primary: '#8798A5',
        secondary: '#D6DDE2',
        glow: '#B7C3CC',
        background: '#1B2A35',
      },

      scholarship: {
        primary: '#5E7381',
        secondary: '#CCD5DB',
        glow: '#AEBBC4',
        background: '#18242E',
      },

      engagement: {
        primary: '#465A67',
        secondary: '#D6DDE2',
        glow: '#93A5B2',
        background: '#111C24',
      },
    };

    return (
      palettes[mode] ||
      palettes.financial
    );
  }, [mode]);

  useFrame((state) => {
    if (!group.current) return;

    const t =
      state.clock.getElapsedTime();

    group.current.rotation.y =
      t * 0.16;

    group.current.rotation.x =
      Math.sin(t * 0.25) *
      0.06;

    const energy =
      budgetProgress * 0.3 +
      scholarshipUrgency * 0.3 +
      engagement * 0.25 -
      academicRisk * 0.15;

    const scale =
      1 + energy * 0.06;

    group.current.scale.set(
      scale,
      scale,
      scale
    );

    const core =
      group.current.getObjectByName(
        'core'
      );

    if (
      core &&
      core.material
    ) {
      core.material.emissiveIntensity =
        0.4 + energy;
    }

    const glow =
      group.current.getObjectByName(
        'glow'
      );

    if (
      glow &&
      glow.material
    ) {
      glow.material.opacity =
        0.08 +
        scholarshipUrgency *
          0.4;
    }
  });

  return (
    <>
      {/* LIGHTING */}
      <ambientLight
        intensity={0.85}
      />

      <pointLight
        position={[0, 0, 5]}
        intensity={1.6}
        color={safeColor(
          palette.secondary,
          '#ffffff'
        )}
      />

      <pointLight
        position={[2, 2, 3]}
        intensity={0.9}
        color={safeColor(
          palette.primary,
          '#708390'
        )}
      />

      {/* FOG */}
      <fog
        attach="fog"
        args={[
          safeColor(
            palette.background,
            '#16232D'
          ),
          5,
          13,
        ]}
      />

      {/* MAIN GROUP */}
      <group ref={group}>
        {/* CORE */}
        <mesh
          name="core"
          position={[0, 0, 0]}
        >
          <icosahedronGeometry
            args={[1.1, 2]}
          />

          <meshPhysicalMaterial
            color={safeColor(
              palette.primary,
              '#708390'
            )}
            emissive={safeColor(
              palette.primary,
              '#708390'
            )}
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.75}
            clearcoat={1}
            transparent
            opacity={0.95}
          />
        </mesh>

        {/* GLOW */}
        <mesh
          name="glow"
          scale={1.5}
        >
          <sphereGeometry
            args={[1.15, 32, 32]}
          />

          <meshBasicMaterial
            color={safeColor(
              palette.glow,
              '#AAB8C2'
            )}
            transparent
            opacity={0.18}
          />
        </mesh>

        {/* MAIN RING */}
        <mesh
          rotation={[
            Math.PI / 2.8,
            0,
            0,
          ]}
        >
          <torusGeometry
            args={[
              2,
              0.03,
              16,
              160,
            ]}
          />

          <meshBasicMaterial
            color={safeColor(
              palette.secondary,
              '#D6DDE2'
            )}
            transparent
            opacity={0.22}
          />
        </mesh>

        {/* SECOND RING */}
        <mesh
          rotation={[
            Math.PI / 4,
            0,
            Math.PI / 3,
          ]}
        >
          <torusGeometry
            args={[
              2.4,
              0.02,
              16,
              120,
            ]}
          />

          <meshBasicMaterial
            color={safeColor(
              palette.primary,
              '#708390'
            )}
            transparent
            opacity={0.12}
          />
        </mesh>

        {/* PARTICLES */}
        <ParticleField
          radius={2.6}
          count={120}
          color={safeColor(
            palette.secondary,
            '#D6DDE2'
          )}
          speed={0.08}
          size={0.025}
        />

        <ParticleField
          radius={3}
          count={180}
          color={safeColor(
            palette.primary,
            '#708390'
          )}
          speed={-0.05}
          size={0.018}
          tilt={0.4}
        />

        {/* FLOATING NODES */}
        <FloatingNode
          position={[
            -2,
            0.4,
            0,
          ]}
          color={safeColor(
            palette.primary,
            '#708390'
          )}
          scale={0.14}
          speed={1.2}
        />

        <FloatingNode
          position={[
            2,
            -0.5,
            0,
          ]}
          color={safeColor(
            palette.secondary,
            '#D6DDE2'
          )}
          scale={0.11}
          speed={1.5}
        />

        <FloatingNode
          position={[
            0,
            2,
            0,
          ]}
          color={safeColor(
            palette.glow,
            '#AAB8C2'
          )}
          scale={0.08}
          speed={1.8}
        />
      </group>
    </>
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function BudgetGalaxy({
  mode = 'financial',
  budgetProgress = 0,
  scholarshipUrgency = 0,
  academicRisk = 0,
  engagement = 0,
}) {
  return (
    <View style={styles.container}>
      <Canvas
        dpr={1.5}
        camera={{
          position: [0, 0, 6],
          fov: 42,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference:
            'high-performance',
        }}
      >
        <Scene
          mode={mode}
          budgetProgress={
            budgetProgress
          }
          scholarshipUrgency={
            scholarshipUrgency
          }
          academicRisk={
            academicRisk
          }
          engagement={engagement}
        />
      </Canvas>

      {/* subtle overlay */}
      <View
        pointerEvents="none"
        style={styles.overlay}
      />
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor:
      '#16232D',

    overflow: 'hidden',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      'rgba(214,221,226,0.03)',
  },
});