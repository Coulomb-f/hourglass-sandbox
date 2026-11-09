// @ts-expect-error three does not ship TypeScript declarations
import * as THREE from "three";

const SIZE = 256;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAIN_COLORS: Array<[number, number, number]> = [
  [236, 208, 150],
  [220, 176, 108],
  [198, 146, 74],
  [176, 118, 54],
  [148, 92, 42],
];

function pickColor(rand: () => number) {
  const t = rand();
  const index = t < 0.12 ? 0 : t < 0.34 ? 1 : t < 0.62 ? 2 : t < 0.84 ? 3 : 4;
  return GRAIN_COLORS[index] ?? GRAIN_COLORS[2];
}

function stampHeight(
  height: Float32Array,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot: number,
  amp: number,
) {
  const pad = Math.ceil(Math.max(rx, ry));
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  for (let iy = -pad; iy <= pad; iy++) {
    for (let ix = -pad; ix <= pad; ix++) {
      const px = x + ix;
      const py = y + iy;
      const dx = px - x;
      const dy = py - y;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const e = (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry);
      if (e > 1) continue;
      const fall = (1 - e) * (1 - e);
      const wx = ((Math.floor(px) % SIZE) + SIZE) % SIZE;
      const wy = ((Math.floor(py) % SIZE) + SIZE) % SIZE;
      const i = wy * SIZE + wx;
      const next = amp * fall;
      const prev = height[i] ?? 0;
      if (next > prev) height[i] = next;
    }
  }
}

export function makeSandTexture() {
  const rand = mulberry32(0x5a1d);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = "#8d5a32";
  ctx.fillRect(0, 0, SIZE, SIZE);

  const height = new Float32Array(SIZE * SIZE);
  const count = 2800;

  for (let i = 0; i < count; i++) {
    const roll = rand();
    const rx = roll > 0.92 ? 2.4 + rand() * 1.1 : 0.8 + rand() * 1.1;
    const ry = rx * (0.7 + rand() * 0.4);
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const rot = rand() * Math.PI;
    const amp = 0.45 + rand() * 0.55;
    const [r, g, b] = pickColor(rand);

    const draw = (ox: number, oy: number) => {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    draw(x, y);
    if (x < rx) draw(x + SIZE, y);
    if (x > SIZE - rx) draw(x - SIZE, y);
    if (y < ry) draw(x, y + SIZE);
    if (y > SIZE - ry) draw(x, y - SIZE);

    stampHeight(height, x, y, rx, ry, rot, amp);
  }

  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  const data = image.data;
  for (let i = 0; i < SIZE * SIZE; i++) {
    const h = height[i] ?? 0;
    const n = rand();
    const cavity = 0.8 + 0.2 * Math.pow(h, 0.75);
    const grit = 0.96 + n * 0.06;
    const o = i * 4;
    data[o] = Math.min(255, (data[o] ?? 0) * cavity * grit);
    data[o + 1] = Math.min(255, (data[o + 1] ?? 0) * cavity * grit);
    data[o + 2] = Math.min(255, (data[o + 2] ?? 0) * cavity * (0.94 + n * 0.08));
    data[o + 3] = Math.floor(Math.min(1, h) * 255);
  }
  ctx.putImageData(image, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export type SandTune = {
  flow: { value: number };
  ripple: { value: number };
  grain: { value: number };
  soft: { value: number };
  stretch: { value: number };
  lift: { value: number };
  posScale: { value: THREE.Vector3 };
  posOffset: { value: THREE.Vector3 };
};

export function createSandMaterial(map: THREE.Texture, tune: SandTune) {
  const material = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.9,
    metalness: 0,
    sheen: 0.08,
    sheenColor: new THREE.Color("#e7c7a0"),
    sheenRoughness: 0.86,
    specularIntensity: 0.38,
    specularColor: new THREE.Color("#fff1dd"),
    envMapIntensity: 0.34,
    side: THREE.DoubleSide,
  });

  material.onBeforeCompile = (shader: {
    uniforms: Record<string, { value: unknown }>;
    vertexShader: string;
    fragmentShader: string;
  }) => {
    shader.uniforms.sandMap = { value: map };
    shader.uniforms.uScale = { value: 2.4 };
    shader.uniforms.uFlow = tune.flow;
    shader.uniforms.uRipple = tune.ripple;
    shader.uniforms.uGrain = tune.grain;
    shader.uniforms.uSoft = tune.soft;
    shader.uniforms.uStretch = tune.stretch;
    shader.uniforms.uLift = tune.lift;
    shader.uniforms.uPosScale = tune.posScale;
    shader.uniforms.uPosOffset = tune.posOffset;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vSandPos;
varying vec3 vSandN;
uniform float uRipple;
uniform vec3 uPosScale;
uniform vec3 uPosOffset;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
#ifndef USE_INSTANCING
  float sandRipple = sin(position.x * 18.0 + position.z * 13.0) * sin(position.y * 14.0 + position.x * 8.0);
  transformed += normal * sandRipple * uRipple;
#endif
vec3 sandP = transformed;
#ifdef USE_INSTANCING
  sandP = (instanceMatrix * vec4(transformed, 1.0)).xyz;
#endif
vSandPos = sandP * uPosScale + uPosOffset;
vSandN = normal;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vSandPos;
varying vec3 vSandN;
uniform sampler2D sandMap;
uniform float uScale;
uniform float uFlow;
uniform float uGrain;
uniform float uSoft;
uniform float uStretch;
uniform float uLift;

float sandHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float sandNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = sandHash(i);
  float n100 = sandHash(i + vec3(1.0, 0.0, 0.0));
  float n010 = sandHash(i + vec3(0.0, 1.0, 0.0));
  float n110 = sandHash(i + vec3(1.0, 1.0, 0.0));
  float n001 = sandHash(i + vec3(0.0, 0.0, 1.0));
  float n101 = sandHash(i + vec3(1.0, 0.0, 1.0));
  float n011 = sandHash(i + vec3(0.0, 1.0, 1.0));
  float n111 = sandHash(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

vec4 sandSample(vec3 p, vec3 n, float scale) {
  vec3 bn = abs(normalize(n));
  bn = pow(bn, vec3(4.0));
  bn /= max(bn.x + bn.y + bn.z, 0.0001);
  vec3 sp = p;
  sp.y = sp.y * uStretch + uFlow;
  vec4 tx = texture2D(sandMap, sp.yz * scale);
  vec4 ty = texture2D(sandMap, sp.xz * scale);
  vec4 tz = texture2D(sandMap, sp.xy * scale);
  return tx * bn.x + ty * bn.y + tz * bn.z;
}`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
vec4 sandFine = sandSample(vSandPos, vSandN, uScale);
vec4 sandCoarse = sandSample(vSandPos, vSandN, uScale * 0.45);
vec3 sandRgb = mix(sandFine.rgb, sandCoarse.rgb, 0.34);
float sandH = mix(sandFine.a, sandCoarse.a, 0.7);
float macro = sandNoise(vSandPos * 2.4);
float macro2 = sandNoise(vSandPos * 0.9 + vec3(5.2, 1.3, 2.4));
sandRgb *= mix(0.94, 1.05, macro);
sandRgb *= mix(vec3(0.96, 0.92, 0.86), vec3(1.05, 1.02, 0.96), macro2);
float axis = length(vSandPos.xz);
float sandNy = abs(normalize(vSandN).y);
float throat = (1.0 - smoothstep(0.02, 0.22, axis)) * smoothstep(0.45, 0.95, sandNy) * smoothstep(-0.02, 0.3, vSandPos.y);
float crest = (1.0 - smoothstep(0.0, 0.1, axis)) * smoothstep(0.55, 0.98, sandNy) * smoothstep(0.02, -0.4, vSandPos.y);
sandRgb *= mix(1.0, 0.72, throat);
sandRgb = mix(sandRgb, sandRgb * vec3(1.08, 1.04, 0.94) + vec3(0.02, 0.012, 0.004), crest * 0.65);
sandRgb *= uLift;
diffuseColor.rgb *= sandRgb;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor *= mix(1.04, 0.78, smoothstep(0.3, 0.9, sandH));
roughnessFactor = clamp(roughnessFactor, 0.45, 1.0);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
float bh = sandH * uGrain;
vec3 surfPos = -vViewPosition;
vec3 vSigmaX = dFdx(surfPos);
vec3 vSigmaY = dFdy(surfPos);
vec3 r1 = cross(vSigmaY, normal);
vec3 r2 = cross(normal, vSigmaX);
float fDet = dot(vSigmaX, r1) * faceDirection;
vec3 vGrad = sign(fDet) * (dFdx(bh) * r1 + dFdy(bh) * r2);
normal = normalize(abs(fDet) * normal - vGrad);`,
      )
      .replace(
        "#include <aomap_fragment>",
        `#include <aomap_fragment>
float sandAo = mix(0.72, 1.0, smoothstep(0.05, 0.7, sandNy));
sandAo *= mix(1.0, 0.8, throat);
reflectedLight.indirectDiffuse *= sandAo;`,
      )
      .replace(
        "vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;",
        `totalEmissiveRadiance += vec3(0.05, 0.02, 0.004) * crest;
vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
float specAmt = dot(totalSpecular, vec3(0.333));
float glint = smoothstep(0.9, 0.995, sandHash(floor(vSandPos * 58.0 + vSandN)));
outgoingLight += vec3(1.05, 0.92, 0.7) * glint * specAmt * 1.15;
if (uSoft > 0.5) outgoingLight += vec3(0.22, 0.12, 0.04);`,
      )
      .replace(
        "#include <opaque_fragment>",
        `if (uSoft > 0.5) {
  float ndv = saturate(abs(dot(normalize(normal), normalize(geometryViewDir))));
  diffuseColor.a *= mix(0.25, 1.0, smoothstep(0.0, 0.48, ndv));
}
#include <opaque_fragment>`,
      );
  };

  return material;
}
