import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function Scene({
  mode,
  budgetProgress,
  scholarshipUrgency,
  academicRisk,
  engagement,
}) {
  const group = useRef();

  const target = useMemo(() => {
    // Each mode nudges the scene differently.
    const base = {
      hue: 180,
      pulse: 1,
      orbitSpeed: 0.9,
      glow: 0.35,
    };
    if (mode === 'scholarship') return { ...base, hue: 280, pulse: 1.4, orbitSpeed: 1.2, glow: 0.65 };
    if (mode === 'academic') return { ...base, hue: 210, pulse: 1.25, orbitSpeed: 1.0, glow: 0.5 };
    if (mode === 'engagement') return { ...base, hue: 140, pulse: 1.6, orbitSpeed: 1.25, glow: 0.7 };
    return base;
  }, [mode]);

  useFrame((state, delta) => {
    if (!group.current) return;

    const t = state.clock.getElapsedTime();

    // Base motion
    group.current.rotation.y = t * 0.25 * target.orbitSpeed;
    group.current.rotation.x = Math.sin(t * 0.35) * 0.12;

    // Widget-driven immersion
    const risk = academicRisk;
    const urgency = scholarshipUrgency;
    const burn = budgetProgress;
    const energy = engagement;

    const pulse = (0.35 + 0.75 * urgency) * target.pulse;

    group.current.scale.setScalar(lerp(0.95, 1.12, burn * 0.35 + energy * 0.25));

    // Move particles towards “importance”
    group.current.position.y = Math.sin(t * 1.1 + urgency * 3) * (0.05 + 0.08 * pulse);

    // Light / material updates are done via refs on meshes.
    const glowMesh = group.current.getObjectByName('glow');
    if (glowMesh && glowMesh.material) {
      glowMesh.material.opacity = lerp(0.15, 0.65, urgency * 0.8 + energy * 0.2) * (1 - risk * 0.2);
      glowMesh.material.color = new THREE.Color().setHSL(target.hue / 360, 0.9, lerp(0.4, 0.65, urgency));
    }

    const core = group.current.getObjectByName('core');
    if (core && core.material) {
      core.material.emissiveIntensity = lerp(0.2, 1.2, urgency) + lerp(0.0, 0.5, burn);
    }
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 0, 6]} intensity={1.1} color={'#ffffff'} />

      {/* Core */}
      <mesh name="core" position={[0, 0, 0]}>
        <torusGeometry args={[1.2, 0.22, 16, 60]} />
        <meshStandardMaterial
          color={'#93c5fd'}
          roughness={0.35}
          metalness={0.7}
          emissive={'#34d399'}
          emissiveIntensity={0.4}
          transparent
        />
      </mesh>

      {/* Glow shell */}
      <mesh name="glow" position={[0, 0, 0]} scale={1.35}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshStandardMaterial
          color={'#a78bfa'}
          transparent
          opacity={0.25}
          emissive={'#a78bfa'}
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* Orbiting rings (widget-driven) */}
      <group>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.8, 0.04, 12, 100]} />
          <meshBasicMaterial color={'#ffffff'} transparent opacity={0.15} />
        </mesh>
      </group>

      {/* Budget “energy” arc */}
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0]} scale={1}>
        <ringGeometry args={[1.05, 1.2, 64]} />
        <meshBasicMaterial color={'#34d399'} transparent opacity={0.25 + budgetProgress * 0.4} />
      </mesh>
    </group>
  );
}

export default function BudgetGalaxy(props) {
  const {
    mode = 'financial',
    budgetProgress = 0,
    scholarshipUrgency = 0,
    academicRisk = 0,
    engagement = 0,
  } = props;

  return (
    <View style={styles.container}>
      <Canvas
        dpr={1}
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <Scene
          mode={mode}
          budgetProgress={budgetProgress}
          scholarshipUrgency={scholarshipUrgency}
          academicRisk={academicRisk}
          engagement={engagement}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

