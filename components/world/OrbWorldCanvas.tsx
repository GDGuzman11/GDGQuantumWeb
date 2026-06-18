'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@/components/sky/NightSkyCanvas';
import { OrbScene } from '@/components/helix/HelixLogo';
import { QuantumField } from '@/components/world/QuantumField';
import { getDive } from '@/lib/dive';

/**
 * Unified full-screen world — the night sky AND the Helix orb in ONE R3F canvas
 * with ONE camera, so the camera can genuinely fly FROM "the orb floating among
 * the stars" INTO the orb's interior in a single unbroken move (no overlay cut).
 *
 * Default-exported, reached only via dynamic(ssr:false) from OrbWorld, so
 * three.js stays in its own async chunk.
 *
 * CameraRig reads the shared dive signal each frame: at rest (progress 0) the
 * camera sits back so the orb reads as a centred glowing mark among the stars;
 * "about" flies it all the way INTO the core (the screen becomes the orb's
 * interior); "projects" pulls it OUT along the orbits.
 */

const REST_Z = 10.5;
const ABOUT_Z = 0.9; // arrives AT the core (the story chamber)
const PROJECTS_Z = 0.12; // plunges PAST the core, down to the quantum field
// The orb sits HIGH in the scene so it reads above the (bottom-anchored) hero
// copy at rest; the camera rises to meet it as the dive flies in.
const ORB_Y = 2.4;
const ORB_SCALE = 1.7; // 0.7× bigger than the base orb

function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    const { progress, section } = getDive();
    const e = easeInOutCubic(Math.min(1, Math.max(0, progress)));
    const toZ = section === 'projects' ? PROJECTS_Z : ABOUT_Z;
    camera.position.z = REST_Z + (toZ - REST_Z) * e;
    camera.position.y = ORB_Y * e; // rest: camera at y0 (orb reads high); dive: rise into the orb
  });
  return null;
}

export default function OrbWorldCanvas({ animate = true }: { animate?: boolean }) {
  return (
    <Canvas
      className="!absolute !inset-0"
      camera={{ position: [0, 0, REST_Z], fov: 50, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
      }}
      frameloop={animate ? 'always' : 'demand'}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x000000, 0);
        gl.setClearAlpha(0);
        scene.background = null;
      }}
    >
      <CameraRig />
      <Sky animate={animate} />
      <group position={[0, ORB_Y, 0]} scale={ORB_SCALE}>
        <OrbScene />
        <QuantumField />
      </group>
    </Canvas>
  );
}
