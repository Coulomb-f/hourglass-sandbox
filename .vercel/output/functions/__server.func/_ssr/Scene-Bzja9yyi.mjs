import { i as __toESM } from "../_runtime.mjs";
import { A as Vector3, C as RepeatWrapping, E as SphereGeometry, M as require_jsx_runtime, N as require_react, _ as MeshStandardMaterial, a as PMREMGenerator, c as Color, d as LatheGeometry, g as MeshPhysicalMaterial, k as Vector2, m as Mesh, n as useFrame, r as useThree, s as CanvasTexture, t as Canvas, v as Object3D, w as SRGBColorSpace } from "../_libs/@react-three/fiber+[...].mjs";
import { n as upperFraction, r as useTimer } from "./routes-Bvf3mR4Q.mjs";
import { n as OrbitControls, t as RoomEnvironment } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Scene-Bzja9yyi.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Inner glass profile and sand volumes for a constant-orifice hourglass. */
var Y_FLOOR = -1.02;
var Y_NECK = .055;
var Y_FILL = .97;
var INSET = .02;
var FUNNEL_DEPTH = .065;
var TAN_REPOSE = Math.tan(33 * Math.PI / 180);
function smoothstep(edge0, edge1, x) {
	const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}
function innerRadius(y) {
	const ay = Math.abs(y);
	const lobe = Math.exp(-(((ay - .62) / .36) ** 2));
	const shoulder = Math.exp(-(((ay - .34) / .16) ** 2));
	let r = .042 + .7 * lobe + .02 * shoulder;
	r += smoothstep(.98, 1.12, ay) * .1;
	const pinch = Math.exp(-((y / .09) ** 2));
	r = r * (1 - .55 * pinch) + .036 * pinch;
	return r;
}
function wallRadius(y) {
	return Math.max(.012, innerRadius(y) - INSET);
}
function glassThickness(y) {
	const ay = Math.abs(y);
	const neck = Math.exp(-((y / .1) ** 2));
	const lip = smoothstep(.96, 1.14, ay);
	return .02 + .022 * neck + .035 * lip;
}
function outerRadius(y) {
	return innerRadius(y) + glassThickness(y);
}
function integrate(y0, y1, radiusAt, steps = 220) {
	if (y1 <= y0) return 0;
	let volume = 0;
	const dy = (y1 - y0) / steps;
	for (let i = 0; i < steps; i++) {
		const r = radiusAt(y0 + (i + .5) * dy);
		volume += Math.PI * r * r * dy;
	}
	return volume;
}
/** Upper-bulb volume with a shallow drain funnel at the free surface. */
function upperVolumeAt(ySurf) {
	if (ySurf <= .055) return 0;
	const flat = integrate(Y_NECK, ySurf, wallRadius);
	const depth = Math.min(FUNNEL_DEPTH, ySurf - Y_NECK);
	const radius = wallRadius(ySurf);
	const funnel = Math.PI * radius * radius * depth / 3;
	return Math.max(0, flat - funnel);
}
var V_MAX = upperVolumeAt(Y_FILL);
function ySurfForUpperVolume(volume) {
	if (volume <= 1e-5) return Y_NECK;
	if (volume >= V_MAX) return Y_FILL;
	let lo = Y_NECK;
	let hi = Y_FILL;
	for (let i = 0; i < 26; i++) {
		const mid = (lo + hi) / 2;
		if (upperVolumeAt(mid) < volume) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
}
/** Lower bulb: a repose cone clipped by the glass. */
function lowerVolumeAt(yPeak) {
	if (yPeak <= -1.02) return 0;
	return integrate(Y_FLOOR, yPeak, (y) => {
		const cone = (yPeak - y) / TAN_REPOSE;
		return Math.min(wallRadius(y), Math.max(0, cone));
	});
}
var Y_PEAK_MAX = -.03;
function yPeakForLowerVolume(volume) {
	if (volume <= 1e-5) return Y_FLOOR;
	if (volume >= lowerVolumeAt(Y_PEAK_MAX)) return Y_PEAK_MAX;
	let lo = Y_FLOOR;
	let hi = Y_PEAK_MAX;
	for (let i = 0; i < 26; i++) {
		const mid = (lo + hi) / 2;
		if (lowerVolumeAt(mid) < volume) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
}
function upperSandProfile(fraction) {
	const volume = Math.min(1, Math.max(0, fraction)) * V_MAX;
	if (volume <= 1e-4) return [];
	const ySurf = ySurfForUpperVolume(volume);
	const depth = Math.min(FUNNEL_DEPTH, Math.max(.012, ySurf - Y_NECK));
	const rSurf = wallRadius(ySurf);
	const points = [];
	const stacks = 26;
	for (let i = 0; i <= stacks; i++) {
		const t = i / stacks;
		const y = Y_NECK + (ySurf - Y_NECK) * t;
		points.push({
			y,
			r: Math.max(.01, wallRadius(y))
		});
	}
	const lipDrop = Math.min(.018, depth * .4);
	const lipIn = Math.min(.04, rSurf * .16);
	const lip = 7;
	for (let i = 1; i <= lip; i++) {
		const ang = i / lip * (Math.PI / 2);
		points.push({
			y: ySurf - (1 - Math.cos(ang)) * lipDrop,
			r: Math.max(.012, rSurf - Math.sin(ang) * lipIn)
		});
	}
	const lipEnd = points[points.length - 1];
	const funnel = 8;
	for (let i = 1; i <= funnel; i++) {
		const t = i / funnel;
		const y0 = lipEnd?.y ?? ySurf;
		const r0 = lipEnd?.r ?? rSurf;
		points.push({
			y: y0 - (y0 - (ySurf - depth)) * t,
			r: Math.max(.008, r0 * (1 - t) + .012 * t)
		});
	}
	return points;
}
function lowerSandProfile(fraction) {
	const volume = (1 - Math.min(1, Math.max(0, fraction))) * V_MAX;
	if (volume <= 1e-4) return [];
	const yPeak = yPeakForLowerVolume(volume);
	const points = [{
		y: yPeak,
		r: .008
	}];
	const stacks = 30;
	for (let i = 1; i <= stacks; i++) {
		const t = i / stacks;
		const y = yPeak + (Y_FLOOR - yPeak) * t;
		const cone = (yPeak - y) / TAN_REPOSE;
		const r = Math.min(wallRadius(y), Math.max(0, cone));
		points.push({
			y,
			r: Math.max(.008, r)
		});
	}
	const floorR = points[points.length - 1]?.r ?? .02;
	for (let i = 1; i <= 5; i++) points.push({
		y: Y_FLOOR,
		r: Math.max(.008, floorR * (1 - i / 5))
	});
	return points;
}
function lowerPeak(fraction) {
	const volume = (1 - Math.min(1, Math.max(0, fraction))) * V_MAX;
	if (volume <= 1e-4) return Y_FLOOR;
	return yPeakForLowerVolume(volume);
}
var SIZE = 256;
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
var GRAIN_COLORS = [
	[
		236,
		208,
		150
	],
	[
		220,
		176,
		108
	],
	[
		198,
		146,
		74
	],
	[
		176,
		118,
		54
	],
	[
		148,
		92,
		42
	]
];
function pickColor(rand) {
	const t = rand();
	return GRAIN_COLORS[t < .12 ? 0 : t < .34 ? 1 : t < .62 ? 2 : t < .84 ? 3 : 4] ?? GRAIN_COLORS[2];
}
function stampHeight(height, x, y, rx, ry, rot, amp) {
	const pad = Math.ceil(Math.max(rx, ry));
	const cos = Math.cos(rot);
	const sin = Math.sin(rot);
	for (let iy = -pad; iy <= pad; iy++) for (let ix = -pad; ix <= pad; ix++) {
		const px = x + ix;
		const py = y + iy;
		const dx = px - x;
		const dy = py - y;
		const lx = dx * cos + dy * sin;
		const ly = -dx * sin + dy * cos;
		const e = lx * lx / (rx * rx) + ly * ly / (ry * ry);
		if (e > 1) continue;
		const fall = (1 - e) * (1 - e);
		const wx = (Math.floor(px) % SIZE + SIZE) % SIZE;
		const i = (Math.floor(py) % SIZE + SIZE) % SIZE * SIZE + wx;
		const next = amp * fall;
		if (next > (height[i] ?? 0)) height[i] = next;
	}
}
function makeSandTexture() {
	const rand = mulberry32(23069);
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
		const rx = rand() > .92 ? 2.4 + rand() * 1.1 : .8 + rand() * 1.1;
		const ry = rx * (.7 + rand() * .4);
		const x = rand() * SIZE;
		const y = rand() * SIZE;
		const rot = rand() * Math.PI;
		const amp = .45 + rand() * .55;
		const [r, g, b] = pickColor(rand);
		const draw = (ox, oy) => {
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
		const cavity = .8 + .2 * Math.pow(h, .75);
		const grit = .96 + n * .06;
		const o = i * 4;
		data[o] = Math.min(255, (data[o] ?? 0) * cavity * grit);
		data[o + 1] = Math.min(255, (data[o + 1] ?? 0) * cavity * grit);
		data[o + 2] = Math.min(255, (data[o + 2] ?? 0) * cavity * (.94 + n * .08));
		data[o + 3] = Math.floor(Math.min(1, h) * 255);
	}
	ctx.putImageData(image, 0, 0);
	const tex = new CanvasTexture(canvas);
	tex.wrapS = RepeatWrapping;
	tex.wrapT = RepeatWrapping;
	tex.colorSpace = SRGBColorSpace;
	tex.anisotropy = 8;
	tex.needsUpdate = true;
	return tex;
}
function createSandMaterial(map, tune) {
	const material = new MeshPhysicalMaterial({
		color: "#ffffff",
		roughness: .9,
		metalness: 0,
		sheen: .08,
		sheenColor: new Color("#e7c7a0"),
		sheenRoughness: .86,
		specularIntensity: .38,
		specularColor: new Color("#fff1dd"),
		envMapIntensity: .34,
		side: 2
	});
	material.onBeforeCompile = (shader) => {
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
		shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
varying vec3 vSandPos;
varying vec3 vSandN;
uniform float uRipple;
uniform vec3 uPosScale;
uniform vec3 uPosOffset;`).replace("#include <begin_vertex>", `#include <begin_vertex>
#ifndef USE_INSTANCING
  float sandRipple = sin(position.x * 18.0 + position.z * 13.0) * sin(position.y * 14.0 + position.x * 8.0);
  transformed += normal * sandRipple * uRipple;
#endif
vec3 sandP = transformed;
#ifdef USE_INSTANCING
  sandP = (instanceMatrix * vec4(transformed, 1.0)).xyz;
#endif
vSandPos = sandP * uPosScale + uPosOffset;
vSandN = normal;`);
		shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
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
}`).replace("#include <map_fragment>", `#include <map_fragment>
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
diffuseColor.rgb *= sandRgb;`).replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
roughnessFactor *= mix(1.04, 0.78, smoothstep(0.3, 0.9, sandH));
roughnessFactor = clamp(roughnessFactor, 0.45, 1.0);`).replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
float bh = sandH * uGrain;
vec3 surfPos = -vViewPosition;
vec3 vSigmaX = dFdx(surfPos);
vec3 vSigmaY = dFdy(surfPos);
vec3 r1 = cross(vSigmaY, normal);
vec3 r2 = cross(normal, vSigmaX);
float fDet = dot(vSigmaX, r1) * faceDirection;
vec3 vGrad = sign(fDet) * (dFdx(bh) * r1 + dFdy(bh) * r2);
normal = normalize(abs(fDet) * normal - vGrad);`).replace("#include <aomap_fragment>", `#include <aomap_fragment>
float sandAo = mix(0.72, 1.0, smoothstep(0.05, 0.7, sandNy));
sandAo *= mix(1.0, 0.8, throat);
reflectedLight.indirectDiffuse *= sandAo;`).replace("vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;", `totalEmissiveRadiance += vec3(0.05, 0.02, 0.004) * crest;
vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
float specAmt = dot(totalSpecular, vec3(0.333));
float glint = smoothstep(0.9, 0.995, sandHash(floor(vSandPos * 58.0 + vSandN)));
outgoingLight += vec3(1.05, 0.92, 0.7) * glint * specAmt * 1.15;
if (uSoft > 0.5) outgoingLight += vec3(0.22, 0.12, 0.04);`).replace("#include <opaque_fragment>", `if (uSoft > 0.5) {
  float ndv = saturate(abs(dot(normalize(normal), normalize(geometryViewDir))));
  diffuseColor.a *= mix(0.25, 1.0, smoothstep(0.0, 0.48, ndv));
}
#include <opaque_fragment>`);
	};
	return material;
}
var BRASS = "#b08d57";
var GRAIN_COUNT = 110;
var GRAVITY = 82;
var TURN_MS = 1450;
function easeInOut(t) {
	return t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
function toVectors(points) {
	const vectors = [];
	for (const point of points) {
		const prev = vectors[vectors.length - 1];
		if (prev && Math.hypot(prev.x - point.r, prev.y - point.y) < 1e-4) continue;
		vectors.push(new Vector2(Math.max(.004, point.r), point.y));
	}
	return vectors;
}
function glassPoints() {
	const pts = [];
	const steps = 80;
	const y0 = -1.12;
	const y1 = 1.12;
	for (let i = 0; i <= steps; i++) {
		const y = y0 + 2.24 * i / steps;
		pts.push(new Vector2(outerRadius(y), y));
	}
	const outerTop = outerRadius(y1);
	const innerTop = innerRadius(y1) * .985;
	for (let i = 1; i <= 5; i++) {
		const t = i / 5;
		pts.push(new Vector2(outerTop + (innerTop - outerTop) * t, y1 + Math.sin(Math.PI * t) * .012));
	}
	for (let i = 1; i <= steps; i++) {
		const y = y1 - 2.24 * i / steps;
		pts.push(new Vector2(Math.max(.02, innerRadius(y) * .994), y));
	}
	const innerBot = innerRadius(y0) * .985;
	const outerBot = outerRadius(y0);
	for (let i = 1; i <= 5; i++) {
		const t = i / 5;
		pts.push(new Vector2(innerBot + (outerBot - innerBot) * t, y0 - Math.sin(Math.PI * t) * .012));
	}
	return pts;
}
function finialPoints() {
	return [
		new Vector2(.012, 1.2),
		new Vector2(.11, 1.24),
		new Vector2(.145, 1.31),
		new Vector2(.09, 1.38),
		new Vector2(.05, 1.43),
		new Vector2(.09, 1.49),
		new Vector2(.038, 1.55),
		new Vector2(.01, 1.59)
	];
}
function plinthPoints() {
	return [
		new Vector2(.02, -1.62),
		new Vector2(1.22, -1.62),
		new Vector2(1.32, -1.52),
		new Vector2(1.16, -1.46),
		new Vector2(.58, -1.4),
		new Vector2(.02, -1.4)
	];
}
function setLathe(mesh, points, radial) {
	if (!mesh) return;
	const vectors = toVectors(points);
	if (vectors.length < 2) {
		mesh.visible = false;
		return;
	}
	const next = new LatheGeometry(vectors, radial);
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
		const x = i / 28 * 64 + i % 3;
		ctx.strokeStyle = i % 4 === 0 ? "rgba(90, 62, 36, 0.45)" : "rgba(18, 10, 6, 0.35)";
		ctx.lineWidth = i % 5 === 0 ? 2 : 1;
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.bezierCurveTo(x + 4, 70, x - 5, 150, x + 2, 256);
		ctx.stroke();
	}
	const tex = new CanvasTexture(canvas);
	tex.wrapS = RepeatWrapping;
	tex.wrapT = RepeatWrapping;
	tex.colorSpace = SRGBColorSpace;
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
	const tex = new CanvasTexture(canvas);
	tex.wrapS = RepeatWrapping;
	tex.wrapT = RepeatWrapping;
	tex.colorSpace = SRGBColorSpace;
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
	glow.addColorStop(.42, "#16130f");
	glow.addColorStop(1, "#0c0b09");
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, 512, 640);
	const tex = new CanvasTexture(canvas);
	tex.colorSpace = SRGBColorSpace;
	return tex;
}
function Studio() {
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);
	(0, import_react.useLayoutEffect)(() => {
		const pmrem = new PMREMGenerator(gl);
		const room = new RoomEnvironment();
		const env = pmrem.fromScene(room, .04).texture;
		scene.environment = env;
		scene.environmentIntensity = .72;
		const backdrop = makeBackdrop();
		if (backdrop) scene.background = backdrop;
		return () => {
			scene.environment = null;
			scene.background = null;
			env.dispose();
			backdrop?.dispose();
			pmrem.dispose();
			room.traverse((obj) => {
				if (obj instanceof Mesh) {
					obj.geometry.dispose();
					(Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((mat) => mat.dispose());
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
	const controls = (0, import_react.useRef)(null);
	const idleRef = (0, import_react.useRef)(idle);
	const reduceRef = (0, import_react.useRef)(reduce);
	idleRef.current = idle;
	reduceRef.current = reduce;
	(0, import_react.useEffect)(() => {
		const rig = new OrbitControls(camera, gl.domElement);
		rig.enablePan = false;
		rig.enableZoom = false;
		rig.enableDamping = true;
		rig.dampingFactor = .08;
		rig.rotateSpeed = .55;
		rig.autoRotateSpeed = .32;
		rig.minPolarAngle = Math.PI / 2 - .55;
		rig.maxPolarAngle = Math.PI / 2 + .22;
		controls.current = rig;
		const fit = () => {
			const narrow = window.innerWidth < 760;
			camera.position.set(narrow ? .08 : .32, narrow ? .55 : .7, narrow ? 7.5 : 5.85);
			rig.target.set(0, narrow ? .28 : .16, 0);
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
	const pivot = (0, import_react.useRef)(null);
	const flip = (0, import_react.useRef)(null);
	const upper = (0, import_react.useRef)(null);
	const lower = (0, import_react.useRef)(null);
	const grains = (0, import_react.useRef)(null);
	const stream = (0, import_react.useRef)(null);
	const shown = (0, import_react.useRef)(1);
	const bucket = (0, import_react.useRef)(-1);
	const spawn = (0, import_react.useRef)(0);
	const dummy = (0, import_react.useMemo)(() => new Object3D(), []);
	const grainState = (0, import_react.useMemo)(() => Array.from({ length: GRAIN_COUNT }, () => ({
		x: 0,
		y: -4,
		z: 0,
		vy: 0,
		alive: false,
		s: 1,
		settle: 0,
		ang: 0
	})), []);
	const wood = (0, import_react.useMemo)(() => makeWoodTexture(), []);
	const stone = (0, import_react.useMemo)(() => makeStoneTexture(), []);
	const glassGeo = (0, import_react.useMemo)(() => new LatheGeometry(glassPoints(), 72), []);
	const finialGeo = (0, import_react.useMemo)(() => new LatheGeometry(finialPoints(), 32), []);
	const plinthGeo = (0, import_react.useMemo)(() => new LatheGeometry(plinthPoints(), 64), []);
	const flipGeo = (0, import_react.useMemo)(() => new LatheGeometry(toVectors(upperSandProfile(1)), 64), []);
	const grainGeo = (0, import_react.useMemo)(() => new SphereGeometry(1, 6, 5), []);
	const [sandMap, setSandMap] = (0, import_react.useState)(null);
	const plainSand = (0, import_react.useMemo)(() => new MeshStandardMaterial({
		color: "#c4924e",
		roughness: .88,
		metalness: 0,
		side: 2
	}), []);
	const pileTune = (0, import_react.useMemo)(() => ({
		flow: { value: 0 },
		ripple: { value: .004 },
		grain: { value: .16 },
		soft: { value: 0 },
		stretch: { value: 1 },
		lift: { value: 1 },
		posScale: { value: new Vector3(1, 1, 1) },
		posOffset: { value: new Vector3() }
	}), []);
	const streamTune = (0, import_react.useMemo)(() => ({
		flow: { value: 0 },
		ripple: { value: 0 },
		grain: { value: .22 },
		soft: { value: 1 },
		stretch: { value: .72 },
		lift: { value: 1.55 },
		posScale: { value: new Vector3(1, 1, 1) },
		posOffset: { value: new Vector3() }
	}), []);
	(0, import_react.useLayoutEffect)(() => {
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
	const sandMat = (0, import_react.useMemo)(() => sandMap ? createSandMaterial(sandMap, pileTune) : plainSand, [
		pileTune,
		plainSand,
		sandMap
	]);
	const grainMat = (0, import_react.useMemo)(() => new MeshStandardMaterial({
		color: "#e4bc78",
		roughness: .46,
		metalness: .04,
		emissive: "#b87430",
		emissiveIntensity: .32
	}), []);
	const streamMat = (0, import_react.useMemo)(() => {
		if (!sandMap) return plainSand;
		const mat = createSandMaterial(sandMap, streamTune);
		mat.transparent = true;
		mat.depthWrite = false;
		return mat;
	}, [
		plainSand,
		sandMap,
		streamTune
	]);
	const brassMat = (0, import_react.useMemo)(() => new MeshStandardMaterial({
		color: BRASS,
		metalness: 1,
		roughness: .28,
		envMapIntensity: 1.15
	}), []);
	const woodMat = (0, import_react.useMemo)(() => new MeshStandardMaterial({
		color: "#5a3d28",
		roughness: .68,
		metalness: .02,
		map: wood,
		envMapIntensity: .25
	}), [wood]);
	const stoneMat = (0, import_react.useMemo)(() => new MeshStandardMaterial({
		color: "#3a3632",
		roughness: .58,
		metalness: .12,
		map: stone,
		envMapIntensity: .45
	}), [stone]);
	const glassMat = (0, import_react.useMemo)(() => new MeshPhysicalMaterial({
		color: "#f4f0e8",
		metalness: 0,
		roughness: .04,
		transmission: .55,
		thickness: .12,
		ior: 1.18,
		transparent: true,
		opacity: .55,
		clearcoat: 1,
		clearcoatRoughness: .06,
		attenuationColor: new Color("#f7f1e6"),
		attenuationDistance: 8,
		envMapIntensity: 1.35,
		depthWrite: false,
		side: 0
	}), []);
	(0, import_react.useEffect)(() => {
		const tex = makeSandTexture();
		if (tex) setSandMap(tex);
		return () => tex?.dispose();
	}, []);
	(0, import_react.useEffect)(() => {
		if (sandMat === plainSand) return;
		return () => sandMat.dispose();
	}, [plainSand, sandMat]);
	(0, import_react.useEffect)(() => {
		if (streamMat === plainSand) return;
		return () => streamMat.dispose();
	}, [plainSand, streamMat]);
	(0, import_react.useEffect)(() => {
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
		woodMat
	]);
	useFrame((_, delta) => {
		const dt = Math.min(delta, .05);
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
				pivotGroup.position.y = Math.sin(eased * Math.PI) * .46;
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
		if (live.phase === "running" || live.phase === "paused" || live.phase === "done") shown.current = upperFraction(live, performance.now());
		else if (live.phase === "idle") {
			const target = 1;
			shown.current += (target - shown.current) * (1 - Math.exp(-dt * 5));
			if (Math.abs(target - shown.current) < .0015) shown.current = target;
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
		const flowing = phase === "running" && shown.current > .004;
		const falling = flowing || phase === "done";
		const land = lowerPeak(shown.current) + .012;
		const top = .045;
		const bottom = land + .018;
		const gap = top - bottom;
		const column = stream.current;
		if (column) {
			const show = flowing && gap > .05;
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
				const stray = Math.random() < .22;
				const angle = Math.random() * Math.PI * 2;
				const radius = stray ? .02 + Math.random() * .03 : Math.random() * .01;
				grain.x = Math.cos(angle) * radius;
				grain.z = Math.sin(angle) * radius;
				grain.y = .03;
				grain.vy = stray ? -.22 - Math.random() * .4 : -.6 - Math.random() * 1.1;
				grain.s = (stray ? .7 : .85) + Math.random() * .7;
				grain.settle = 0;
				grain.ang = angle;
				grain.alive = true;
				dirty = true;
			}
			if (grain.alive && falling && grain.settle <= 0) {
				grain.vy -= GRAVITY * dt;
				grain.y += grain.vy * dt;
				const r = Math.hypot(grain.x, grain.z);
				const surface = land - .012 - r * TAN_REPOSE;
				if (grain.y <= surface || grain.y <= -1.02) {
					if (surface < -1.008 || grain.y <= -1.02) grain.alive = false;
					else {
						grain.y = surface;
						grain.settle = .12 + Math.random() * .2;
						grain.ang = r < .02 ? Math.random() * Math.PI * 2 : Math.atan2(grain.z, grain.x);
						grain.vy = 0;
					}
				}
				dirty = true;
			} else if (grain.alive && falling && grain.settle > 0) {
				grain.settle -= dt;
				grain.x += Math.cos(grain.ang) * .22 * dt;
				grain.z += Math.sin(grain.ang) * .22 * dt;
				const r = Math.hypot(grain.x, grain.z);
				grain.y = land - .012 - r * TAN_REPOSE;
				if (grain.settle <= 0 || grain.y < -1 || r > .72) grain.alive = false;
				dirty = true;
			}
			if ((phase === "idle" || phase === "turning") && grain.alive) {
				grain.alive = false;
				grain.settle = 0;
				dirty = true;
			}
			const radius = grain.alive ? .0062 * grain.s * (grain.settle > 0 ? .75 : 1) : 0;
			const stretch = !grain.alive || grain.settle > 0 ? 1 : Math.min(2.3, 1 + Math.abs(grain.vy) * .09);
			dummy.position.set(grain.x, grain.alive ? grain.y : -6, grain.z);
			dummy.scale.set(radius, radius * stretch, radius);
			dummy.rotation.set(0, 0, 0);
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);
		}
		if (dirty) mesh.instanceMatrix.needsUpdate = true;
	});
	const posts = [
		Math.PI / 4,
		3 * Math.PI / 4,
		5 * Math.PI / 4,
		7 * Math.PI / 4
	];
	const lip = outerRadius(1.12);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
		geometry: plinthGeo,
		material: stoneMat,
		receiveShadow: true,
		castShadow: true
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		ref: pivot,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				geometry: glassGeo,
				material: glassMat,
				renderOrder: 3
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				ref: upper,
				material: sandMat,
				renderOrder: 1,
				castShadow: true,
				frustumCulled: false
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				ref: lower,
				material: sandMat,
				renderOrder: 1,
				castShadow: true,
				frustumCulled: false
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
				ref: flip,
				visible: false,
				rotation: [
					Math.PI,
					0,
					0
				],
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
					geometry: flipGeo,
					material: sandMat
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				ref: stream,
				material: streamMat,
				visible: false,
				frustumCulled: false,
				renderOrder: 2,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.011,
					.02,
					1,
					16,
					1,
					true
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("instancedMesh", {
				ref: grains,
				args: [
					grainGeo,
					grainMat,
					GRAIN_COUNT
				],
				frustumCulled: false
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				position: [
					0,
					1.12,
					0
				],
				rotation: [
					Math.PI / 2,
					0,
					0
				],
				material: brassMat,
				castShadow: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("torusGeometry", { args: [
					lip + .02,
					.046,
					14,
					72
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				position: [
					0,
					-1.12,
					0
				],
				rotation: [
					Math.PI / 2,
					0,
					0
				],
				material: brassMat,
				castShadow: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("torusGeometry", { args: [
					lip + .02,
					.046,
					14,
					72
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				position: [
					0,
					1.2,
					0
				],
				material: brassMat,
				castShadow: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.4,
					.46,
					.09,
					48
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				position: [
					0,
					-1.2,
					0
				],
				material: brassMat,
				castShadow: true,
				receiveShadow: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.46,
					.4,
					.09,
					48
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				geometry: finialGeo,
				material: brassMat,
				castShadow: true
			}),
			posts.map((angle) => {
				const x = Math.cos(angle) * .98;
				const z = Math.sin(angle) * .98;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
					position: [
						x,
						0,
						z
					],
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
							material: woodMat,
							castShadow: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
								.034,
								.038,
								2.22,
								12
							] })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
							position: [
								0,
								1.08,
								0
							],
							material: brassMat,
							castShadow: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
								.052,
								.052,
								.07,
								12
							] })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
							position: [
								0,
								-1.08,
								0
							],
							material: brassMat,
							castShadow: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
								.052,
								.052,
								.07,
								12
							] })
						})
					]
				}, angle);
			})
		]
	})] });
}
function FloorShadow() {
	const map = (0, import_react.useMemo)(() => {
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
		const tex = new CanvasTexture(canvas);
		tex.colorSpace = SRGBColorSpace;
		return tex;
	}, []);
	(0, import_react.useEffect)(() => () => map?.dispose(), [map]);
	if (!map) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
		rotation: [
			-Math.PI / 2,
			0,
			0
		],
		position: [
			0,
			-1.6,
			0
		],
		renderOrder: 0,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circleGeometry", { args: [1.7, 48] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
			map,
			transparent: true,
			depthWrite: false
		})]
	});
}
function Scene() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Canvas, {
		className: "absolute inset-0 touch-none",
		dpr: [1, 1.5],
		shadows: true,
		camera: {
			position: [
				.32,
				.7,
				5.85
			],
			fov: 32,
			near: .1,
			far: 40
		},
		gl: {
			antialias: true,
			alpha: false,
			powerPreference: "high-performance"
		},
		onCreated: ({ gl }) => {
			gl.toneMapping = 4;
			gl.toneMappingExposure = 1.05;
			gl.outputColorSpace = SRGBColorSpace;
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Studio, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ambientLight", {
				intensity: .24,
				color: "#f6efe4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("directionalLight", {
				position: [
					3.5,
					6.4,
					4.1
				],
				intensity: 2.5,
				color: "#fff4e4",
				castShadow: true,
				"shadow-mapSize-width": 1024,
				"shadow-mapSize-height": 1024,
				"shadow-bias": -5e-4,
				"shadow-camera-near": 2,
				"shadow-camera-far": 18,
				"shadow-camera-left": -3.2,
				"shadow-camera-right": 3.2,
				"shadow-camera-top": 3.2,
				"shadow-camera-bottom": -3.2
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("directionalLight", {
				position: [
					-4.6,
					2.4,
					-3.4
				],
				intensity: 1.35,
				color: "#b7c6d6"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("spotLight", {
				position: [
					.2,
					5.4,
					1.6
				],
				angle: .42,
				penumbra: .85,
				intensity: 18,
				color: "#ffe7c4",
				distance: 14
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hourglass, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloorShadow, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CameraRig, {})
		]
	});
}
//#endregion
export { Scene as default };
