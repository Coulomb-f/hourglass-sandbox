import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
// @ts-expect-error three does not ship TypeScript declarations
import * as THREE from "three";
// @ts-expect-error three does not ship TypeScript declarations
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// @ts-expect-error three does not ship TypeScript declarations
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  TAN_REPOSE,
  Y_FLOOR,
  innerRadius,
  lowerPeak,
  lowerSandProfile,
  outerRadius,
  upperSandProfile,
  type ProfilePoint,
} from "@/components/hourglass/profile";
import { createSandMaterial, makeSandTexture, type SandTune } from "@/components/hourglass/sand";
import { upperFraction, useTimer } from "@/components/hourglass/store";

const BRASS = "#b08d57";
const GRAIN_COUNT = 110;
const GRAVITY = 82;
const TURN_MS = 1450;

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function toVectors(points: ProfilePoint[]) {
  const vectors: THREE.Vector2[] = [];
  for (const point of points) {
    const prev = vectors[vectors.length - 1];
    if (prev && Math.hypot(prev.x - point.r, prev.y - point.y) < 1e-4) continue;
    vectors.push(new THREE.Vector2(Math.max(0.004, point.r), point.y));
  }
  return vectors;
}

function glassPoints() {
  const pts: THREE.Vector2[] = [];
  const steps = 80;
  const y0 = -1.12;
  const y1 = 1.12;
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps;
    pts.push(new THREE.Vector2(outerRadius(y), y));
  }
  const outerTop = outerRadius(y1);
  const innerTop = innerRadius(y1) * 0.985;
  for (let i = 1; i <= 5; i++) {
    const t = i / 5;
    pts.push(new THREE.Vector2(outerTop + (innerTop - outerTop) * t, y1 + Math.sin(Math.PI * t) * 0.012));
  }
  for (let i = 1; i <= steps; i++) {
    const y = y1 - ((y1 - y0) * i) / steps;
    pts.push(new THREE.Vector2(Math.max(0.02, innerRadius(y) * 0.994), y));
  }
  const innerBot = innerRadius(y0) * 0.985;
  const outerBot = outerRadius(y0);
  for (let i = 1; i <= 5; i++) {
    const t = i / 5;
    pts.push(new THREE.Vector2(innerBot + (outerBot - innerBot) * t, y0 - Math.sin(Math.PI * t) * 0.012));
  }
  return pts;
}

function finialPoints() {
  return [
    new THREE.Vector2(0.012, 1.2),
    new THREE.Vector2(0.11, 1.24),
    new THREE.Vector2(0.145, 1.31),
    new THREE.Vector2(0.09, 1.38),
    new THREE.Vector2(0.05, 1.43),
    new THREE.Vector2(0.09, 1.49),
    new THREE.Vector2(0.038, 1.55),
    new THREE.Vector2(0.01, 1.59),
  ];
}

function plinthPoints() {
  return [
    new THREE.Vector2(0.02, -1.62),
    new THREE.Vector2(1.22, -1.62),
    new THREE.Vector2(1.32, -1.52),
    new THREE.Vector2(1.16, -1.46),
    new THREE.Vector2(0.58, -1.4),
    new THREE.Vector2(0.02, -1.4),
  ];
}

function setLathe(mesh: THREE.Mesh | null, points: ProfilePoint[], radial: number) {
  if (!mesh) return;
  const vectors = toVectors(points);
  if (vectors.length < 2) {
    mesh.visible = false;
    return;
  }
  const next = new THREE.LatheGeometry(vectors, radial);
  const prev = mesh.geometry;
  mesh.geometry = next;
  mesh.visible = true;
  prev.dispose();
}

function makeWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#3d2b1c";
  ctx.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 28; i++) {
    const x = (i / 28) * 64 + (i % 3);
    ctx.strokeStyle = i % 4 === 0 ? "rgba(90, 62, 36, 0.45)" : "rgba(18, 10, 6, 0.35)";
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 4, 70, x - 5, 150, x + 2, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#2a2724";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const shade = 28 + Math.random() * 28;
    ctx.fillStyle = `rgba(${shade}, ${shade - 2}, ${shade - 4}, 0.45)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1.4, 1.4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBackdrop() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const glow = ctx.createRadialGradient(256, 250, 20, 256, 280, 420);
  glow.addColorStop(0, "#2c261e");
  glow.addColorStop(0.42, "#16130f");
  glow.addColorStop(1, "#0c0b09");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 640);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type Grain = {
  x: number;
  y: number;
  z: number;
  vy: number;
  alive: boolean;
  s: number;
  settle: number;
  ang: number;
};

function Studio() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.72;
    const backdrop = makeBackdrop();
    if (backdrop) scene.background = backdrop;
    return () => {
      scene.environment = null;
      scene.background = null;
      env.dispose();
      backdrop?.dispose();
      pmrem.dispose();
      room.traverse((obj: any) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((mat: any) => mat.dispose());
        }
      });
    };
  }, [gl, scene]);
  return null;
}

function CameraRig() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const idle = useTimer((s) => s.phase === "idle");
  const reduce = useTimer((s) => s.reduceMotion);
  const controls = useRef<OrbitControls | null>(null);
  const idleRef = useRef(idle);
  const reduceRef = useRef(reduce);
  idleRef.current = idle;
  reduceRef.current = reduce;

  useEffect(() => {
    const rig = new OrbitControls(camera, gl.domElement);
    rig.enablePan = false;
    rig.enableZoom = false;
    rig.enableDamping = true;
    rig.dampingFactor = 0.08;
    rig.rotateSpeed = 0.55;
    rig.autoRotateSpeed = 0.32;
    rig.minPolarAngle = Math.PI / 2 - 0.55;
    rig.maxPolarAngle = Math.PI / 2 + 0.22;
    controls.current = rig;

    const fit = () => {
      const narrow = window.innerWidth < 760;
      camera.position.set(narrow ? 0.08 : 0.32, narrow ? 0.55 : 0.7, narrow ? 7.5 : 5.85);
      rig.target.set(0, narrow ? 0.28 : 0.16, 0);
      rig.update();
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      rig.dispose();
      controls.current = null;
    };
  }, [camera, gl]);

  useFrame(() => {
    const rig = controls.current;
    if (!rig) return;
    rig.autoRotate = idleRef.current && !reduceRef.current;
    rig.update();
  });

  return null;
}

function Hourglass() {
  const pivot = useRef<THREE.Group>(null);
  const flip = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Mesh>(null);
  const lower = useRef<THREE.Mesh>(null);
  const grains = useRef<THREE.InstancedMesh>(null);
  const stream = useRef<THREE.Mesh>(null);
  const shown = useRef(1);
  const bucket = useRef(-1);
  const spawn = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const grainState = useMemo<Grain[]>(
    () =>
      Array.from({ length: GRAIN_COUNT }, () => ({
        x: 0,
        y: -4,
        z: 0,
        vy: 0,
        alive: false,
        s: 1,
        settle: 0,
        ang: 0,
      })),
    [],
  );

  const wood = useMemo(() => makeWoodTexture(), []);
  const stone = useMemo(() => makeStoneTexture(), []);
  const glassGeo = useMemo(() => new THREE.LatheGeometry(glassPoints(), 72), []);
  const finialGeo = useMemo(() => new THREE.LatheGeometry(finialPoints(), 32), []);
  const plinthGeo = useMemo(() => new THREE.LatheGeometry(plinthPoints(), 64), []);
  const flipGeo = useMemo(() => new THREE.LatheGeometry(toVectors(upperSandProfile(1)), 64), []);
  const grainGeo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  const [sandMap, setSandMap] = useState<THREE.Texture | null>(null);
  const plainSand = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c4924e",
        roughness: 0.88,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const pileTune = useMemo<SandTune>(
    () => ({
      flow: { value: 0 },
      ripple: { value: 0.004 },
      grain: { value: 0.16 },
      soft: { value: 0 },
      stretch: { value: 1 },
      lift: { value: 1 },
      posScale: { value: new THREE.Vector3(1, 1, 1) },
      posOffset: { value: new THREE.Vector3() },
    }),
    [],
  );
  const streamTune = useMemo<SandTune>(
    () => ({
      flow: { value: 0 },
      ripple: { value: 0 },
      grain: { value: 0.22 },
      soft: { value: 1 },
      stretch: { value: 0.72 },
      lift: { value: 1.55 },
      posScale: { value: new THREE.Vector3(1, 1, 1) },
      posOffset: { value: new THREE.Vector3() },
    }),
    [],
  );

  useLayoutEffect(() => {
    setLathe(upper.current, upperSandProfile(1), 64);
    bucket.current = 1;
    const mesh = grains.current;
    if (!mesh) return;
    for (let i = 0; i < GRAIN_COUNT; i++) {
      dummy.position.set(0, -6, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  const sandMat = useMemo(
    () => (sandMap ? createSandMaterial(sandMap, pileTune) : plainSand),
    [pileTune, plainSand, sandMap],
  );
  const grainMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e4bc78",
        roughness: 0.46,
        metalness: 0.04,
        emissive: "#b87430",
        emissiveIntensity: 0.32,
      }),
    [],
  );
  const streamMat = useMemo(() => {
    if (!sandMap) return plainSand;
    const mat = createSandMaterial(sandMap, streamTune);
    mat.transparent = true;
    mat.depthWrite = false;
    return mat;
  }, [plainSand, sandMap, streamTune]);
  const brassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: BRASS,
        metalness: 1,
        roughness: 0.28,
        envMapIntensity: 1.15,
      }),
    [],
  );
  const woodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5a3d28",
        roughness: 0.68,
        metalness: 0.02,
        map: wood,
        envMapIntensity: 0.25,
      }),
    [wood],
  );
  const stoneMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a3632",
        roughness: 0.58,
        metalness: 0.12,
        map: stone,
        envMapIntensity: 0.45,
      }),
    [stone],
  );
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f4f0e8",
        metalness: 0,
        roughness: 0.04,
        transmission: 0.55,
        thickness: 0.12,
        ior: 1.18,
        transparent: true,
        opacity: 0.55,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        attenuationColor: new THREE.Color("#f7f1e6"),
        attenuationDistance: 8,
        envMapIntensity: 1.35,
        depthWrite: false,
        side: THREE.FrontSide,
      }),
    [],
  );

  useEffect(() => {
    const tex = makeSandTexture();
    if (tex) setSandMap(tex);
    return () => tex?.dispose();
  }, []);

  useEffect(() => {
    if (sandMat === plainSand) return;
    return () => sandMat.dispose();
  }, [plainSand, sandMat]);

  useEffect(() => {
    if (streamMat === plainSand) return;
    return () => streamMat.dispose();
  }, [plainSand, streamMat]);

  useEffect(() => {
    return () => {
      glassGeo.dispose();
      finialGeo.dispose();
      plinthGeo.dispose();
      flipGeo.dispose();
      grainGeo.dispose();
      grainMat.dispose();
      plainSand.dispose();
      brassMat.dispose();
      woodMat.dispose();
      stoneMat.dispose();
      glassMat.dispose();
      wood?.dispose();
      stone?.dispose();
      upper.current?.geometry.dispose();
      lower.current?.geometry.dispose();
    };
  }, [
    brassMat,
    finialGeo,
    flipGeo,
    glassGeo,
    glassMat,
    grainGeo,
    grainMat,
    plinthGeo,
    plainSand,
    stone,
    stoneMat,
    wood,
    woodMat,
  ]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const state = useTimer.getState();
    const now = performance.now();
    state.tick(now);

    const pivotGroup = pivot.current;
    if (state.phase === "turning" && state.turnStarted != null && pivotGroup) {
      const dur = state.reduceMotion ? 0 : TURN_MS;
      const raw = dur === 0 ? 1 : Math.min(1, (now - state.turnStarted) / dur);
      if (raw >= 1) {
        pivotGroup.rotation.x = 0;
        pivotGroup.position.y = 0;
        shown.current = 1;
        bucket.current = -2;
        if (flip.current) flip.current.visible = false;
        state.finishTurn();
      } else {
        const eased = easeInOut(raw);
        pivotGroup.rotation.x = eased * Math.PI;
        pivotGroup.position.y = Math.sin(eased * Math.PI) * 0.46;
        if (flip.current) flip.current.visible = true;
        if (upper.current) upper.current.visible = false;
        if (lower.current) lower.current.visible = false;
      }
    } else if (pivotGroup && state.phase !== "turning") {
      pivotGroup.rotation.x = 0;
      pivotGroup.position.y = 0;
      if (flip.current) flip.current.visible = false;
    }

    const live = useTimer.getState();
    if (live.phase === "running" || live.phase === "paused" || live.phase === "done") {
      shown.current = upperFraction(live, performance.now());
    } else if (live.phase === "idle") {
      const target = 1;
      shown.current += (target - shown.current) * (1 - Math.exp(-dt * 5));
      if (Math.abs(target - shown.current) < 0.0015) shown.current = target;
    }

    const turning = useTimer.getState().phase === "turning";
    const nextBucket = turning ? -1 : Math.round(shown.current * 2500) / 2500;
    if (!turning && nextBucket !== bucket.current) {
      bucket.current = nextBucket;
      setLathe(upper.current, upperSandProfile(shown.current), 64);
      setLathe(lower.current, lowerSandProfile(shown.current), 56);
    }

    const mesh = grains.current;
    if (!mesh) return;
    const phase = useTimer.getState().phase;
    const flowing = phase === "running" && shown.current > 0.004;
    const falling = flowing || phase === "done";
    const land = lowerPeak(shown.current) + 0.012;
    const top = 0.045;
    const bottom = land + 0.018;
    const gap = top - bottom;
    const column = stream.current;
    if (column) {
      const show = flowing && gap > 0.05;
      column.visible = show;
      if (show) {
        column.scale.set(1, gap, 1);
        column.position.y = (top + bottom) / 2;
        streamTune.posScale.value.set(1, gap, 1);
        streamTune.posOffset.value.set(0, (top + bottom) / 2, 0);
        streamTune.flow.value = (streamTune.flow.value + dt * 3.6) % 80;
      }
    }
    if (flowing) spawn.current = Math.min(8, spawn.current + dt * 140);
    else spawn.current = 0;

    let dirty = false;
    for (let i = 0; i < GRAIN_COUNT; i++) {
      const grain = grainState[i];
      if (!grain) continue;
      if (!grain.alive && flowing && spawn.current >= 1) {
        spawn.current -= 1;
        const stray = Math.random() < 0.22;
        const angle = Math.random() * Math.PI * 2;
        const radius = stray ? 0.02 + Math.random() * 0.03 : Math.random() * 0.01;
        grain.x = Math.cos(angle) * radius;
        grain.z = Math.sin(angle) * radius;
        grain.y = 0.03;
        grain.vy = stray ? -0.22 - Math.random() * 0.4 : -0.6 - Math.random() * 1.1;
        grain.s = (stray ? 0.7 : 0.85) + Math.random() * 0.7;
        grain.settle = 0;
        grain.ang = angle;
        grain.alive = true;
        dirty = true;
      }
      if (grain.alive && falling && grain.settle <= 0) {
        grain.vy -= GRAVITY * dt;
        grain.y += grain.vy * dt;
        const r = Math.hypot(grain.x, grain.z);
        const yPeak = land - 0.012;
        const surface = yPeak - r * TAN_REPOSE;
        if (grain.y <= surface || grain.y <= Y_FLOOR) {
          if (surface < Y_FLOOR + 0.012 || grain.y <= Y_FLOOR) grain.alive = false;
          else {
            grain.y = surface;
            grain.settle = 0.12 + Math.random() * 0.2;
            grain.ang = r < 0.02 ? Math.random() * Math.PI * 2 : Math.atan2(grain.z, grain.x);
            grain.vy = 0;
          }
        }
        dirty = true;
      } else if (grain.alive && falling && grain.settle > 0) {
        grain.settle -= dt;
        grain.x += Math.cos(grain.ang) * 0.22 * dt;
        grain.z += Math.sin(grain.ang) * 0.22 * dt;
        const r = Math.hypot(grain.x, grain.z);
        const yPeak = land - 0.012;
        grain.y = yPeak - r * TAN_REPOSE;
        if (grain.settle <= 0 || grain.y < Y_FLOOR + 0.02 || r > 0.72) grain.alive = false;
        dirty = true;
      }
      if ((phase === "idle" || phase === "turning") && grain.alive) {
        grain.alive = false;
        grain.settle = 0;
        dirty = true;
      }
      const radius = grain.alive ? 0.0062 * grain.s * (grain.settle > 0 ? 0.75 : 1) : 0;
      const stretch = !grain.alive || grain.settle > 0 ? 1 : Math.min(2.3, 1 + Math.abs(grain.vy) * 0.09);
      dummy.position.set(grain.x, grain.alive ? grain.y : -6, grain.z);
      dummy.scale.set(radius, radius * stretch, radius);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    if (dirty) mesh.instanceMatrix.needsUpdate = true;
  });

  const posts = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  const lip = outerRadius(1.12);

  return (
    <group>
      <mesh geometry={plinthGeo} material={stoneMat} receiveShadow castShadow />
      <group ref={pivot}>
        <mesh geometry={glassGeo} material={glassMat} renderOrder={3} />
        <mesh ref={upper} material={sandMat} renderOrder={1} castShadow frustumCulled={false} />
        <mesh ref={lower} material={sandMat} renderOrder={1} castShadow frustumCulled={false} />
        <group ref={flip} visible={false} rotation={[Math.PI, 0, 0]}>
          <mesh geometry={flipGeo} material={sandMat} />
        </group>
        <mesh ref={stream} material={streamMat} visible={false} frustumCulled={false} renderOrder={2}>
          <cylinderGeometry args={[0.011, 0.02, 1, 16, 1, true]} />
        </mesh>
        <instancedMesh ref={grains} args={[grainGeo, grainMat, GRAIN_COUNT]} frustumCulled={false} />

        <mesh position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={brassMat} castShadow>
          <torusGeometry args={[lip + 0.02, 0.046, 14, 72]} />
        </mesh>
        <mesh position={[0, -1.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={brassMat} castShadow>
          <torusGeometry args={[lip + 0.02, 0.046, 14, 72]} />
        </mesh>
        <mesh position={[0, 1.2, 0]} material={brassMat} castShadow>
          <cylinderGeometry args={[0.4, 0.46, 0.09, 48]} />
        </mesh>
        <mesh position={[0, -1.2, 0]} material={brassMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.46, 0.4, 0.09, 48]} />
        </mesh>
        <mesh geometry={finialGeo} material={brassMat} castShadow />

        {posts.map((angle) => {
          const x = Math.cos(angle) * 0.98;
          const z = Math.sin(angle) * 0.98;
          return (
            <group key={angle} position={[x, 0, z]}>
              <mesh material={woodMat} castShadow>
                <cylinderGeometry args={[0.034, 0.038, 2.22, 12]} />
              </mesh>
              <mesh position={[0, 1.08, 0]} material={brassMat} castShadow>
                <cylinderGeometry args={[0.052, 0.052, 0.07, 12]} />
              </mesh>
              <mesh position={[0, -1.08, 0]} material={brassMat} castShadow>
                <cylinderGeometry args={[0.052, 0.052, 0.07, 12]} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

function FloorShadow() {
  const map = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const glow = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    glow.addColorStop(0, "rgba(0,0,0,0.55)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  useEffect(() => () => map?.dispose(), [map]);
  if (!map) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} renderOrder={0}>
      <circleGeometry args={[1.7, 48]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} />
    </mesh>
  );
}

export default function Scene() {
  return (
    <Canvas
      className="absolute inset-0 touch-none"
      dpr={[1, 1.5]}
      shadows
      camera={{ position: [0.32, 0.7, 5.85], fov: 32, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <Studio />
      <ambientLight intensity={0.24} color="#f6efe4" />
      <directionalLight
        position={[3.5, 6.4, 4.1]}
        intensity={2.5}
        color="#fff4e4"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
        shadow-camera-near={2}
        shadow-camera-far={18}
        shadow-camera-left={-3.2}
        shadow-camera-right={3.2}
        shadow-camera-top={3.2}
        shadow-camera-bottom={-3.2}
      />
      <directionalLight position={[-4.6, 2.4, -3.4]} intensity={1.35} color="#b7c6d6" />
      <spotLight position={[0.2, 5.4, 1.6]} angle={0.42} penumbra={0.85} intensity={18} color="#ffe7c4" distance={14} />
      <Hourglass />
      <FloorShadow />
      <CameraRig />
    </Canvas>
  );
}
