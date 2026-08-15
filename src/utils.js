export const TAU = Math.PI * 2;
export const COUNT = 30000;
export const STARS = 3000;

export function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

export function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

export function smoothstep(edge0, edge1, x) {
    const t = clamp01((x - edge0) / (edge1 - edge0 + 1e-9));
    return t * t * (3 - 2 * t);
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function polarFromUniform(u) {
    return Math.acos(2 * u - 1);
}
