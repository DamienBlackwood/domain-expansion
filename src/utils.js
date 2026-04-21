export const TAU = Math.PI * 2;
export const COUNT = 30000;
export const STARS = 3000;

export function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

export function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

export function getDissolveParticle(i, t, phases, phases2) {
    const p = phases[i];
    const p2 = phases2[i];
    const shell = 62 + p * 92;
    const a = p * TAU + t * (0.08 + p2 * 0.12);
    const wave = Math.sin(t * 0.7 + p * 9) * 2.6;
    return {
        x: Math.cos(a) * shell + wave,
        y: (p2 - 0.5) * 84 + Math.cos(t * 0.5 + p2 * 11) * 6,
        z: Math.sin(a) * shell + Math.sin(t * 0.8 + p2 * 7) * 2.2,
        r: 0.05,
        g: 0.11,
        b: 0.24,
        s: 0.16 + (1 - p2) * 0.22,
    };
}
