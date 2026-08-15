import { COUNT, TAU, clamp01, smoothstep, lerp } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases, phases2 } from '../engine/particles.js';

const CHIMERA_BUILDUP_SECONDS = 5.5;
export { CHIMERA_BUILDUP_SECONDS };

export function animateChimera(t) {
    const build = clamp01(t / CHIMERA_BUILDUP_SECONDS);

    const eShadowFloor = smoothstep(0.0,  0.25, build);
    const eSpines      = smoothstep(0.15, 0.50, build);
    const eGeysers     = smoothstep(0.4,  0.70, build);

    const baseY = -20;

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i], pct = i / COUNT;
        let x, y, z, r, g, b, s, reveal;

        const sx = (p - 0.5) * 10;
        const sy = baseY + 15 + p2 * 10;
        const sz = (p2 - 0.5) * 10;

        if (pct < 0.40) {
            const a   = p * TAU * 3.0 + t * 0.1;
            const rad = 2 + Math.pow(p2, 0.7) * 85;

            const wave  = Math.sin(rad * 0.12 - t * 2.0 + p * 8.0) * 1.5;
            const swell = Math.sin(rad * 0.05 + t * 1.2) * 2.0;

            x = Math.cos(a) * rad;
            z = Math.sin(a) * rad * 0.65;
            y = baseY + wave + swell + p2 * 1.5;

            const highlight = Math.max(0, Math.sin(t * 1.5 + rad * 0.2 + p * 10) - 0.8) * 3.0;
            r = 0.01 + highlight * 0.05;
            g = 0.02 + highlight * 0.8;
            b = 0.03 + highlight * 0.6;
            s = 0.4 + (1.0 - rad / 85) * 1.2 + highlight * 0.5;
            reveal = eShadowFloor;

        } else if (pct < 0.75) {
            const side   = p < 0.5 ? -1 : 1;
            const spineU = (p * 2) % 1;
            const boneIdx = Math.floor(spineU * 12);

            const arch   = Math.sin(spineU * Math.PI) * 12;
            const height = baseY + spineU * 45;
            const rootWobble = Math.sin(boneIdx * 1.4) * 3.5;

            x = side * (8 + arch + rootWobble);
            y = height + Math.sin(t * 0.5 + boneIdx) * 0.5;
            z = -15 + boneIdx * 1.8 + Math.cos(spineU * Math.PI) * 5;

            r = 0.25; g = 0.35; b = 0.38;
            s = 0.8 + p2 * 0.7;
            reveal = eSpines;

        } else {
            const node  = Math.floor(p * 5);
            const nodeX = Math.cos(node * 1.2) * 30;
            const nodeZ = Math.sin(node * 1.2) * 20;

            const rise = (p2 + t * (0.3 + p * 0.1)) % 1;

            x = nodeX + Math.sin(t * 2 + p * 15) * 3;
            y = baseY + rise * 35;
            z = nodeZ + Math.cos(t * 1.8 + p2 * 10) * 3;

            const fade = Math.sin(rise * Math.PI);
            r = 0.01;
            g = 0.15 * fade;
            b = 0.10 * fade;
            s = 0.5 + fade * 1.5;
            reveal = eGeysers;
        }

        targetPositions[i * 3]     = lerp(sx, x, reveal);
        targetPositions[i * 3 + 1] = lerp(sy, y, reveal);
        targetPositions[i * 3 + 2] = lerp(sz, z, reveal);
        targetColors[i * 3]     = lerp(0.01, r, reveal);
        targetColors[i * 3 + 1] = lerp(0.02, g, reveal);
        targetColors[i * 3 + 2] = lerp(0.03, b, reveal);
        targetSizes[i] = lerp(0.1, s, reveal);
    }
}
