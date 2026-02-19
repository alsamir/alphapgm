'use client';

import { useRef, useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════
   Error Boundary - prevents any 3D crash from taking down the page
   ═══════════════════════════════════════════════════════════════════════ */
class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn('[ConverterScene] 3D error caught by boundary:', error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Constants & Palette
   ═══════════════════════════════════════════════════════════════════════ */
const PLATINUM = '#d4d4e8';
const PALLADIUM = '#ffd866';
const RHODIUM = '#5b9cf5';
const EMERALD = '#00e88f';
const CORE_DARK = '#0a0f1e';

/* ═══════════════════════════════════════════════════════════════════════
   Honeycomb Cell - a single hexagonal tube representing a catalytic
   converter channel. Uses cylinder geometry rotated 30deg for hex shape.
   ═══════════════════════════════════════════════════════════════════════ */
function HoneycombCell({
  position,
  delay,
  color,
  emissiveColor,
}: {
  position: [number, number, number];
  delay: number;
  color: string;
  emissiveColor: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !innerRef.current) return;
    const t = state.clock.elapsedTime;
    // Subtle breathing pulse per cell
    const pulse = Math.sin(t * 1.5 + delay) * 0.03;
    meshRef.current.scale.set(1 + pulse, 1, 1 + pulse);
    // Inner emissive tube pulses brightness
    const mat = innerRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.3 + Math.sin(t * 2.0 + delay * 2) * 0.25;
  });

  return (
    <group position={position}>
      {/* Outer hex wall */}
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.18, 0.18, 1.6, 6, 1, true]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.95}
          roughness={0.08}
          envMapIntensity={2.0}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner glowing tube */}
      <mesh ref={innerRef} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.12, 0.12, 1.65, 6, 1, false]} />
        <meshStandardMaterial
          color={CORE_DARK}
          emissive={emissiveColor}
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.3}
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Honeycomb Grid - hexagonal arrangement of cells forming the
   catalytic converter cross-section. This is the visual centerpiece.
   ═══════════════════════════════════════════════════════════════════════ */
function HoneycombGrid() {
  const groupRef = useRef<THREE.Group>(null);

  const cells = useMemo(() => {
    const items: { pos: [number, number, number]; color: string; emissive: string; delay: number }[] = [];
    const colors = [PLATINUM, PALLADIUM, RHODIUM];
    const emissives = [PLATINUM, PALLADIUM, RHODIUM];
    const hexSpacing = 0.33;
    const rings = 4; // Number of hex rings from center
    let idx = 0;

    // Generate hex grid positions using axial coordinates
    for (let q = -rings; q <= rings; q++) {
      for (let r = -rings; r <= rings; r++) {
        const s = -q - r;
        if (Math.abs(s) > rings) continue;
        // Distance from center in hex coords
        const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
        if (dist > rings) continue;

        // Convert axial to cartesian
        const x = hexSpacing * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
        const y = hexSpacing * (1.5 * r);

        const cIdx = idx % 3;
        items.push({
          pos: [x, y, 0],
          color: colors[cIdx],
          emissive: emissives[cIdx],
          delay: dist * 0.8 + idx * 0.15,
        });
        idx++;
      }
    }
    return items;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.15) * 0.08;
    groupRef.current.rotation.x = Math.sin(t * 0.12) * 0.04;
  });

  return (
    <group ref={groupRef}>
      {cells.map((cell, i) => (
        <HoneycombCell
          key={i}
          position={cell.pos}
          delay={cell.delay}
          color={cell.color}
          emissiveColor={cell.emissive}
        />
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Converter Shell - the outer cylindrical casing of the catalytic
   converter, slightly transparent to reveal the honeycomb inside.
   ═══════════════════════════════════════════════════════════════════════ */
function ConverterShell() {
  const shellRef = useRef<THREE.Mesh>(null);
  const ringFrontRef = useRef<THREE.Mesh>(null);
  const ringBackRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!shellRef.current) return;
    const t = state.clock.elapsedTime;
    // Very subtle pulse on the shell
    const s = 1 + Math.sin(t * 0.8) * 0.005;
    shellRef.current.scale.set(s, 1, s);
  });

  return (
    <group>
      {/* Main cylindrical shell */}
      <mesh ref={shellRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 1.8, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#1a1a2e"
          metalness={0.97}
          roughness={0.04}
          envMapIntensity={2.5}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Front rim ring */}
      <mesh ref={ringFrontRef} position={[0, 0, 0.9]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.2, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={EMERALD}
          emissive={EMERALD}
          emissiveIntensity={1.2}
          metalness={1}
          roughness={0.1}
          toneMapped={false}
        />
      </mesh>

      {/* Back rim ring */}
      <mesh ref={ringBackRef} position={[0, 0, -0.9]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.2, 0.03, 16, 64]} />
        <meshStandardMaterial
          color={EMERALD}
          emissive={EMERALD}
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0.1}
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Orbital Metal Sphere - represents a precious metal orbiting
   the converter. Each has its own ref, speed, and color.
   ═══════════════════════════════════════════════════════════════════════ */
function MetalOrbit({
  color,
  radius,
  speed,
  size,
  tiltX,
  tiltZ,
  offset,
}: {
  color: string;
  radius: number;
  speed: number;
  size: number;
  tiltX: number;
  tiltZ: number;
  offset: number;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const trailRef1 = useRef<THREE.Mesh>(null);
  const trailRef2 = useRef<THREE.Mesh>(null);
  const trailRef3 = useRef<THREE.Mesh>(null);

  const tiltMatrix = useMemo(() => {
    const m = new THREE.Matrix4();
    m.makeRotationFromEuler(new THREE.Euler(tiltX, 0, tiltZ));
    return m;
  }, [tiltX, tiltZ]);

  const tempVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset;

    // Main sphere
    if (sphereRef.current) {
      tempVec.set(Math.cos(t) * radius, Math.sin(t * 0.7) * 0.3, Math.sin(t) * radius);
      tempVec.applyMatrix4(tiltMatrix);
      sphereRef.current.position.copy(tempVec);
      sphereRef.current.rotation.y = t * 2;
    }

    // Glow sphere
    if (glowRef.current) {
      tempVec.set(Math.cos(t) * radius, Math.sin(t * 0.7) * 0.3, Math.sin(t) * radius);
      tempVec.applyMatrix4(tiltMatrix);
      glowRef.current.position.copy(tempVec);
      const pulse = 1 + Math.sin(t * 3) * 0.2;
      glowRef.current.scale.setScalar(pulse);
    }

    // Trail particles - follow behind the main sphere
    const trails = [trailRef1, trailRef2, trailRef3];
    trails.forEach((ref, i) => {
      if (!ref.current) return;
      const trailT = t - (i + 1) * 0.15;
      tempVec.set(
        Math.cos(trailT) * radius,
        Math.sin(trailT * 0.7) * 0.3,
        Math.sin(trailT) * radius
      );
      tempVec.applyMatrix4(tiltMatrix);
      ref.current.position.copy(tempVec);
      const trailScale = 1 - (i + 1) * 0.25;
      ref.current.scale.setScalar(Math.max(0.3, trailScale));
    });
  });

  return (
    <group>
      {/* Orbital path ring */}
      <mesh rotation={[tiltX, 0, tiltZ]}>
        <torusGeometry args={[radius, 0.006, 16, 128]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
          metalness={1}
          roughness={0.2}
          transparent
          opacity={0.08}
          toneMapped={false}
        />
      </mesh>

      {/* Main metal sphere */}
      <mesh ref={sphereRef}>
        <dodecahedronGeometry args={[size, 1]} />
        <meshPhysicalMaterial
          color={color}
          metalness={1}
          roughness={0.05}
          envMapIntensity={3}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>

      {/* Glow around sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 2.5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          toneMapped={false}
        />
      </mesh>

      {/* Trail particles */}
      <mesh ref={trailRef1}>
        <sphereGeometry args={[size * 0.5, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} toneMapped={false} />
      </mesh>
      <mesh ref={trailRef2}>
        <sphereGeometry args={[size * 0.35, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} toneMapped={false} />
      </mesh>
      <mesh ref={trailRef3}>
        <sphereGeometry args={[size * 0.2, 6, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Energy Stream - particles flowing through the converter,
   representing the extraction/recovery process
   ═══════════════════════════════════════════════════════════════════════ */
function EnergyParticle({
  startZ,
  endZ,
  xOffset,
  yOffset,
  speed,
  color,
  delay,
}: {
  startZ: number;
  endZ: number;
  xOffset: number;
  yOffset: number;
  speed: number;
  color: string;
  delay: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!ref.current || !matRef.current) return;
    const t = state.clock.elapsedTime;
    const cycle = ((t * speed + delay) % 4) / 4;

    // Flow from startZ to endZ
    const z = startZ + cycle * (endZ - startZ);
    ref.current.position.set(
      xOffset + Math.sin(t * 2 + delay) * 0.08,
      yOffset + Math.cos(t * 1.5 + delay) * 0.08,
      z
    );

    // Scale and opacity based on position (brighter in the middle)
    const midPoint = Math.sin(cycle * Math.PI);
    matRef.current.opacity = midPoint * 0.7;
    ref.current.scale.setScalar(0.02 + midPoint * 0.04);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.5}
        toneMapped={false}
      />
    </mesh>
  );
}

function EnergyStreams() {
  const particles = useMemo(() => {
    const items: {
      startZ: number; endZ: number; xOff: number; yOff: number;
      speed: number; color: string; delay: number;
    }[] = [];
    const colors = [EMERALD, PLATINUM, PALLADIUM, RHODIUM];
    const seed = [
      [0.3, 0.1], [-0.2, 0.4], [0.5, -0.3], [-0.4, -0.2],
      [0.1, -0.5], [-0.1, 0.2], [0.4, 0.3], [-0.3, -0.4],
      [0.2, -0.1], [-0.5, 0.1], [0.0, 0.5], [0.3, -0.4],
      [-0.2, -0.1], [0.1, 0.3], [-0.4, 0.2], [0.5, 0.0],
      [-0.1, -0.3], [0.2, 0.4], [-0.3, 0.0], [0.4, -0.2],
    ];
    for (let i = 0; i < seed.length; i++) {
      items.push({
        startZ: -3.5,
        endZ: 3.5,
        xOff: seed[i][0],
        yOff: seed[i][1],
        speed: 0.5 + (i % 4) * 0.15,
        color: colors[i % colors.length],
        delay: i * 0.5,
      });
    }
    return items;
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <EnergyParticle
          key={i}
          startZ={p.startZ}
          endZ={p.endZ}
          xOffset={p.xOff}
          yOffset={p.yOff}
          speed={p.speed}
          color={p.color}
          delay={p.delay}
        />
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Holographic Price Ring - a floating ring with price-data aesthetic,
   rotating around the converter like a holographic HUD
   ═══════════════════════════════════════════════════════════════════════ */
function HolographicRing({
  radius,
  color,
  speed,
  yPos,
  thickness,
}: {
  radius: number;
  color: string;
  speed: number;
  yPos: number;
  thickness: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const dashRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.rotation.y = t * speed;
      ringRef.current.rotation.x = Math.sin(t * 0.3) * 0.05;
    }
    if (dashRef.current) {
      dashRef.current.rotation.y = -t * speed * 1.5;
    }
  });

  return (
    <group position={[0, yPos, 0]}>
      {/* Solid ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, thickness, 8, 128]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.2}
          transparent
          opacity={0.15}
          toneMapped={false}
        />
      </mesh>
      {/* Dashed accent ring */}
      <mesh ref={dashRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius + 0.15, thickness * 0.5, 6, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.06}
          wireframe
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Pedestal Platform - a glowing base beneath the converter
   ═══════════════════════════════════════════════════════════════════════ */
function Pedestal() {
  const baseRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + Math.sin(t * 0.8) * 0.02;
    }
    if (gridRef.current) {
      gridRef.current.rotation.y = t * 0.05;
    }
  });

  return (
    <group position={[0, -2.8, 0]}>
      {/* Main platform disc */}
      <mesh ref={baseRef} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.5, 3.5, 0.02, 64]} />
        <meshPhysicalMaterial
          color="#0d1117"
          metalness={0.95}
          roughness={0.1}
          envMapIntensity={1.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Platform glow */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[2.0, 3.6, 64]} />
        <meshBasicMaterial
          color={EMERALD}
          transparent
          opacity={0.08}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Hex grid on the platform */}
      <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.5, 3.5, 6, 4]} />
        <meshBasicMaterial
          color={EMERALD}
          wireframe
          transparent
          opacity={0.04}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Edge ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <torusGeometry args={[3.5, 0.015, 8, 64]} />
        <meshStandardMaterial
          color={EMERALD}
          emissive={EMERALD}
          emissiveIntensity={1.5}
          metalness={1}
          roughness={0.2}
          transparent
          opacity={0.25}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Data Ticker Cubes - small floating octahedrons representing
   live data points, drifting in the scene periphery
   ═══════════════════════════════════════════════════════════════════════ */
function DataTicker({
  position,
  color,
  size,
  speed,
}: {
  position: [number, number, number];
  color: string;
  size: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const baseY = position[1];

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * speed;
    ref.current.rotation.y = t * speed * 0.6;
    ref.current.position.y = baseY + Math.sin(t * 0.4 + position[0] * 2) * 0.2;
  });

  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[size, 0]} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.95}
        roughness={0.08}
        envMapIntensity={2.5}
        clearcoat={1}
        clearcoatRoughness={0.1}
        emissive={color}
        emissiveIntensity={0.4}
        toneMapped={false}
      />
    </mesh>
  );
}

function DataTickers() {
  const tickers = useMemo(() => {
    const items: { pos: [number, number, number]; color: string; size: number; speed: number }[] = [];
    const colors = [PLATINUM, PALLADIUM, RHODIUM, EMERALD];
    const positions: [number, number, number][] = [
      [4.5, 1.5, -1.5], [-4.0, -1.2, 2.0], [3.2, -2.0, 2.8],
      [-3.8, 2.2, -1.0], [5.0, 0.3, -3.0], [-3.2, -0.5, 3.5],
      [2.0, 2.8, 1.5], [-2.5, 1.5, -3.0], [4.0, -1.5, 0.8],
      [-4.5, -1.8, -0.5], [1.5, -2.5, -2.8], [-1.8, 2.5, 2.5],
    ];
    for (let i = 0; i < positions.length; i++) {
      items.push({
        pos: positions[i],
        color: colors[i % colors.length],
        size: 0.06 + (i % 3) * 0.025,
        speed: 0.4 + (i % 4) * 0.15,
      });
    }
    return items;
  }, []);

  return (
    <>
      {tickers.map((t, i) => (
        <DataTicker key={i} position={t.pos} color={t.color} size={t.size} speed={t.speed} />
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Pulse Waves - expanding rings of energy emanating from the converter
   ═══════════════════════════════════════════════════════════════════════ */
function PulseWave({ color, delay, axis }: { color: string; delay: number; axis: 'y' | 'z' }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!ref.current || !matRef.current) return;
    const t = state.clock.elapsedTime;
    const cycle = ((t + delay) % 5) / 5;
    const scale = 2.5 + cycle * 5;
    ref.current.scale.setScalar(scale);
    matRef.current.opacity = Math.max(0, 0.1 * (1 - cycle * cycle));
  });

  return (
    <mesh
      ref={ref}
      rotation={axis === 'y' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
    >
      <torusGeometry args={[1, 0.004, 8, 64]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.1}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Vertical Data Columns - thin lines rising from the pedestal
   representing live market data feeds
   ═══════════════════════════════════════════════════════════════════════ */
function DataColumn({
  x,
  z,
  color,
  speed,
  maxHeight,
}: {
  x: number;
  z: number;
  color: string;
  speed: number;
  maxHeight: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!ref.current || !matRef.current) return;
    const t = state.clock.elapsedTime;
    const cycle = ((t * speed) % maxHeight) / maxHeight;
    ref.current.position.y = -2.8 + cycle * maxHeight;
    const fade = Math.sin(cycle * Math.PI);
    matRef.current.opacity = fade * 0.35;
    ref.current.scale.y = 0.5 + fade * 1.5;
  });

  return (
    <mesh ref={ref} position={[x, -2.8, z]}>
      <boxGeometry args={[0.01, 0.4, 0.01]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.3}
        toneMapped={false}
      />
    </mesh>
  );
}

function DataColumns() {
  const columns = useMemo(() => {
    const items: { x: number; z: number; color: string; speed: number; maxHeight: number }[] = [];
    const colors = [PLATINUM, PALLADIUM, RHODIUM, EMERALD];
    const positions: [number, number][] = [
      [-3.0, -1.5], [-2.0, 2.5], [-0.5, -2.8], [1.0, 3.0],
      [2.5, -2.0], [3.2, 1.5], [-3.5, 0.8], [3.8, -0.5],
      [-1.5, 1.8], [1.5, -1.2], [2.8, 2.8], [-2.8, -2.2],
      [0.5, 3.2], [-1.0, -3.0], [3.5, 0.0], [-3.2, 1.2],
    ];
    for (let i = 0; i < positions.length; i++) {
      items.push({
        x: positions[i][0],
        z: positions[i][1],
        color: colors[i % colors.length],
        speed: 0.25 + (i % 3) * 0.12,
        maxHeight: 4.5 + (i % 3),
      });
    }
    return items;
  }, []);

  return (
    <>
      {columns.map((c, i) => (
        <DataColumn key={i} x={c.x} z={c.z} color={c.color} speed={c.speed} maxHeight={c.maxHeight} />
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Inlet / Outlet Cones - the tapered pipe connections on either side
   of the converter, giving it an industrial silhouette
   ═══════════════════════════════════════════════════════════════════════ */
function ConverterPipes() {
  const leftRef = useRef<THREE.Mesh>(null);
  const rightRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (leftRef.current) {
      const mat = leftRef.current.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = 0.15 + Math.sin(t * 1.2) * 0.1;
    }
    if (rightRef.current) {
      const mat = rightRef.current.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = 0.15 + Math.sin(t * 1.2 + Math.PI) * 0.1;
    }
  });

  return (
    <group>
      {/* Inlet cone (left/back) */}
      <mesh ref={leftRef} position={[0, 0, -1.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 2.1, 1.8, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#12121e"
          metalness={0.97}
          roughness={0.06}
          envMapIntensity={2.0}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
          emissive={EMERALD}
          emissiveIntensity={0.15}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outlet cone (right/front) */}
      <mesh ref={rightRef} position={[0, 0, 1.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 2.1, 1.8, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#12121e"
          metalness={0.97}
          roughness={0.06}
          envMapIntensity={2.0}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
          emissive={PALLADIUM}
          emissiveIntensity={0.15}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inlet pipe */}
      <mesh position={[0, 0, -3.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 1.0, 16, 1, true]} />
        <meshPhysicalMaterial
          color="#0d0d1a"
          metalness={0.98}
          roughness={0.05}
          envMapIntensity={1.8}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outlet pipe */}
      <mesh position={[0, 0, 3.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 1.0, 16, 1, true]} />
        <meshPhysicalMaterial
          color="#0d0d1a"
          metalness={0.98}
          roughness={0.05}
          envMapIntensity={1.8}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Scene Composition - assembles all elements into the final scene
   ═══════════════════════════════════════════════════════════════════════ */
function Scene() {
  const masterGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!masterGroupRef.current) return;
    const t = state.clock.elapsedTime;
    // Very slow master rotation for the entire converter assembly
    masterGroupRef.current.rotation.y = t * 0.06;
  });

  return (
    <>
      {/* Lighting rig */}
      <ambientLight intensity={0.12} />

      {/* Key light - bright white from upper right */}
      <pointLight position={[8, 6, 5]} intensity={1.5} color="#ffffff" />
      {/* Fill light - warm palladium gold */}
      <pointLight position={[-6, 3, -5]} intensity={0.7} color={PALLADIUM} />
      {/* Rim light - rhodium blue from behind */}
      <pointLight position={[4, -3, -6]} intensity={0.6} color={RHODIUM} />
      {/* Bottom accent - emerald uplighting */}
      <pointLight position={[0, -6, 0]} intensity={0.4} color={EMERALD} />
      {/* Top fill - platinum silver */}
      <pointLight position={[-2, 8, 2]} intensity={0.5} color={PLATINUM} />
      {/* Front accent for the honeycomb face */}
      <pointLight position={[0, 0, 6]} intensity={0.3} color={EMERALD} />

      {/* Main converter assembly with Float for gentle hover */}
      <Float speed={0.4} rotationIntensity={0.04} floatIntensity={0.2}>
        <group ref={masterGroupRef}>
          {/* Converter cross-section with honeycomb */}
          <HoneycombGrid />
          <ConverterShell />
          <ConverterPipes />

          {/* Energy particles flowing through */}
          <EnergyStreams />
        </group>
      </Float>

      {/* Precious metal orbital elements */}
      <MetalOrbit
        color={PLATINUM}
        radius={3.2}
        speed={0.35}
        size={0.14}
        tiltX={0.3}
        tiltZ={0.15}
        offset={0}
      />
      <MetalOrbit
        color={PALLADIUM}
        radius={3.8}
        speed={-0.28}
        size={0.12}
        tiltX={1.0}
        tiltZ={-0.2}
        offset={2.1}
      />
      <MetalOrbit
        color={RHODIUM}
        radius={4.3}
        speed={0.2}
        size={0.1}
        tiltX={0.6}
        tiltZ={0.4}
        offset={4.2}
      />

      {/* Holographic HUD rings */}
      <HolographicRing radius={2.8} color={EMERALD} speed={0.15} yPos={0} thickness={0.012} />
      <HolographicRing radius={3.5} color={PLATINUM} speed={-0.1} yPos={0.5} thickness={0.008} />
      <HolographicRing radius={4.0} color={RHODIUM} speed={0.08} yPos={-0.3} thickness={0.006} />

      {/* Pulse waves */}
      <PulseWave color={EMERALD} delay={0} axis="z" />
      <PulseWave color={PLATINUM} delay={1.7} axis="z" />
      <PulseWave color={PALLADIUM} delay={3.3} axis="z" />

      {/* Pedestal base */}
      <Pedestal />

      {/* Floating data tickers */}
      <DataTickers />

      {/* Vertical data columns */}
      <DataColumns />

      {/* Ambient sparkle particles in metal colors */}
      <Sparkles count={120} scale={14} size={1.5} speed={0.12} color={EMERALD} opacity={0.2} />
      <Sparkles count={70} scale={12} size={1.8} speed={0.08} color={PALLADIUM} opacity={0.15} />
      <Sparkles count={60} scale={13} size={1.0} speed={0.15} color={RHODIUM} opacity={0.12} />
      <Sparkles count={50} scale={11} size={0.8} speed={0.1} color={PLATINUM} opacity={0.1} />

      {/* Distant stars for depth */}
      <Stars radius={50} depth={40} count={800} factor={2} saturation={0.2} fade speed={0.3} />

      {/* Environment map for realistic metallic reflections */}
      <Environment preset="night" />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Static CSS Fallback: shown when WebGL is unavailable or scene crashes.
   Features a CSS-only animated representation of the converter.
   ═══════════════════════════════════════════════════════════════════════ */
function StaticFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <div className="relative w-96 h-96">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00e88f]/10 via-transparent to-[#5b9cf5]/10 animate-pulse" />

        {/* Platinum orbit */}
        <div
          className="absolute inset-2 rounded-full border border-[#d4d4e8]/12 animate-spin"
          style={{ animationDuration: '14s' }}
        />
        {/* Platinum dot */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#d4d4e8] shadow-[0_0_12px_rgba(212,212,232,0.6)] animate-spin"
          style={{ animationDuration: '14s', transformOrigin: '0 190px' }}
        />

        {/* Palladium orbit */}
        <div
          className="absolute inset-8 rounded-full border border-[#ffd866]/10 animate-spin"
          style={{ animationDuration: '18s', animationDirection: 'reverse' }}
        />

        {/* Rhodium orbit */}
        <div
          className="absolute inset-14 rounded-full border border-[#5b9cf5]/8 animate-spin"
          style={{ animationDuration: '22s' }}
        />

        {/* Converter shape - hexagonal center */}
        <div className="absolute inset-20 flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Honeycomb representation */}
            <div
              className="absolute inset-4 bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] rounded-xl rotate-45 shadow-[0_0_40px_rgba(0,232,143,0.15)]"
              style={{ animationDuration: '10s' }}
            />
            <div
              className="absolute inset-8 bg-gradient-to-tr from-[#0a0f1e] to-[#12121e] rounded-lg rotate-12 shadow-[0_0_30px_rgba(0,232,143,0.1)]"
            />
          </div>
        </div>

        {/* Center glow */}
        <div
          className="absolute inset-[7rem] rounded-full bg-[#00e88f]/12 animate-pulse"
          style={{ animationDuration: '2.5s' }}
        />

        {/* Inner core */}
        <div
          className="absolute inset-[8rem] rounded-full bg-gradient-to-br from-[#00e88f]/20 to-[#ffd866]/10 animate-pulse"
          style={{ animationDuration: '3s' }}
        />

        {/* Platform line at bottom */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[#00e88f]/30 to-transparent" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Exported Component - ConverterScene with WebGL detection and
   error boundary protection
   ═══════════════════════════════════════════════════════════════════════ */
export default function ConverterScene() {
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      } else {
        // Block software renderers (SwiftShader) that would be too slow
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (typeof renderer === 'string' && renderer.includes('SwiftShader')) {
            setWebglSupported(false);
          }
        }
      }
    } catch {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported) return <StaticFallback />;

  return (
    <SceneErrorBoundary fallback={<StaticFallback />}>
      <div className="w-full h-full">
        <Canvas
          camera={{ position: [0, 1.2, 9], fov: 36 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: true,
          }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.4;
          }}
        >
          <Scene />
        </Canvas>
      </div>
    </SceneErrorBoundary>
  );
}
