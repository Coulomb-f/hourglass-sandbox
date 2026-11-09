/** Inner glass profile and sand volumes for a constant-orifice hourglass. */

export const Y_FLOOR = -1.02;
export const Y_NECK = 0.055;
export const Y_FILL = 0.97;
export const INSET = 0.02;
export const FUNNEL_DEPTH = 0.065;
const REPOSE_DEG = 33;
export const TAN_REPOSE = Math.tan((REPOSE_DEG * Math.PI) / 180);

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function innerRadius(y: number) {
  const ay = Math.abs(y);
  const lobe = Math.exp(-(((ay - 0.62) / 0.36) ** 2));
  const shoulder = Math.exp(-(((ay - 0.34) / 0.16) ** 2));
  let r = 0.042 + 0.7 * lobe + 0.02 * shoulder;
  r += smoothstep(0.98, 1.12, ay) * 0.1;
  const pinch = Math.exp(-((y / 0.09) ** 2));
  r = r * (1 - 0.55 * pinch) + 0.036 * pinch;
  return r;
}

export function wallRadius(y: number) {
  return Math.max(0.012, innerRadius(y) - INSET);
}

export function glassThickness(y: number) {
  const ay = Math.abs(y);
  const neck = Math.exp(-((y / 0.1) ** 2));
  const lip = smoothstep(0.96, 1.14, ay);
  return 0.02 + 0.022 * neck + 0.035 * lip;
}

export function outerRadius(y: number) {
  return innerRadius(y) + glassThickness(y);
}

function integrate(y0: number, y1: number, radiusAt: (y: number) => number, steps = 220) {
  if (y1 <= y0) return 0;
  let volume = 0;
  const dy = (y1 - y0) / steps;
  for (let i = 0; i < steps; i++) {
    const y = y0 + (i + 0.5) * dy;
    const r = radiusAt(y);
    volume += Math.PI * r * r * dy;
  }
  return volume;
}

/** Upper-bulb volume with a shallow drain funnel at the free surface. */
export function upperVolumeAt(ySurf: number) {
  if (ySurf <= Y_NECK) return 0;
  const flat = integrate(Y_NECK, ySurf, wallRadius);
  const depth = Math.min(FUNNEL_DEPTH, ySurf - Y_NECK);
  const radius = wallRadius(ySurf);
  const funnel = (Math.PI * radius * radius * depth) / 3;
  return Math.max(0, flat - funnel);
}

export const V_MAX = upperVolumeAt(Y_FILL);

export function ySurfForUpperVolume(volume: number) {
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
export function lowerVolumeAt(yPeak: number) {
  if (yPeak <= Y_FLOOR) return 0;
  return integrate(Y_FLOOR, yPeak, (y) => {
    const cone = (yPeak - y) / TAN_REPOSE;
    return Math.min(wallRadius(y), Math.max(0, cone));
  });
}

const Y_PEAK_MAX = -0.03;

export function yPeakForLowerVolume(volume: number) {
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

export type ProfilePoint = { y: number; r: number };

export function upperSandProfile(fraction: number): ProfilePoint[] {
  const volume = Math.min(1, Math.max(0, fraction)) * V_MAX;
  if (volume <= 1e-4) return [];
  const ySurf = ySurfForUpperVolume(volume);
  const depth = Math.min(FUNNEL_DEPTH, Math.max(0.012, ySurf - Y_NECK));
  const rSurf = wallRadius(ySurf);
  const points: ProfilePoint[] = [];
  const stacks = 26;
  for (let i = 0; i <= stacks; i++) {
    const t = i / stacks;
    const y = Y_NECK + (ySurf - Y_NECK) * t;
    points.push({ y, r: Math.max(0.01, wallRadius(y)) });
  }
  const lipDrop = Math.min(0.018, depth * 0.4);
  const lipIn = Math.min(0.04, rSurf * 0.16);
  const lip = 7;
  for (let i = 1; i <= lip; i++) {
    const t = i / lip;
    const ang = t * (Math.PI / 2);
    points.push({
      y: ySurf - (1 - Math.cos(ang)) * lipDrop,
      r: Math.max(0.012, rSurf - Math.sin(ang) * lipIn),
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
      r: Math.max(0.008, r0 * (1 - t) + 0.012 * t),
    });
  }
  return points;
}

export function lowerSandProfile(fraction: number): ProfilePoint[] {
  const volume = (1 - Math.min(1, Math.max(0, fraction))) * V_MAX;
  if (volume <= 1e-4) return [];
  const yPeak = yPeakForLowerVolume(volume);
  const points: ProfilePoint[] = [{ y: yPeak, r: 0.008 }];
  const stacks = 30;
  for (let i = 1; i <= stacks; i++) {
    const t = i / stacks;
    const y = yPeak + (Y_FLOOR - yPeak) * t;
    const cone = (yPeak - y) / TAN_REPOSE;
    const r = Math.min(wallRadius(y), Math.max(0, cone));
    points.push({ y, r: Math.max(0.008, r) });
  }
  const floorR = points[points.length - 1]?.r ?? 0.02;
  for (let i = 1; i <= 5; i++) {
    points.push({ y: Y_FLOOR, r: Math.max(0.008, floorR * (1 - i / 5)) });
  }
  return points;
}

export function lowerPeak(fraction: number) {
  const volume = (1 - Math.min(1, Math.max(0, fraction))) * V_MAX;
  if (volume <= 1e-4) return Y_FLOOR;
  return yPeakForLowerVolume(volume);
}
