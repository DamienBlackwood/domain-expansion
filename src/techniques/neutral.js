import { COUNT, TAU } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases, phases2 } from '../engine/particles.js';

export function animateNeutral(t) {
    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i];
        const pct = i / COUNT;

        // slow orbital drift — no fixed shape, just scattered energy
        const a = p * TAU * 2.3 + t * (0.02 + p2 * 0.03);
        const elev = (p2 - 0.5) * 2.6;
        const base = Math.sqrt(Math.max(0, 1 - elev * elev));

        // layered radii — inner wisp, mid haze, outer dust
        let rad, brightness;
        if (pct < 0.12) {
            // inner wisps — close, slightly brighter
            rad = 4 + p * 18 + Math.sin(t * 0.6 + p * 11) * 2;
            brightness = 0.6 + Math.sin(t * 1.2 + p2 * 8) * 0.15;
        } else if (pct < 0.5) {
            // mid haze — scattered, drifting
            rad = 14 + p2 * 36 + Math.sin(t * 0.35 + p * 7) * 4;
            brightness = 0.3 + Math.sin(t * 0.8 + p * 13) * 0.08;
        } else {
            // outer dust — very sparse, dim
            rad = 30 + p * 65 + Math.sin(t * 0.2 + p2 * 5) * 6;
            brightness = 0.12 + Math.sin(t * 0.5 + p2 * 9) * 0.04;
        }

        const drift = Math.sin(t * 0.15 + p * 4.7) * 3;
        const x = Math.cos(a) * base * rad + drift;
        const y = elev * rad * 0.7 + Math.sin(t * 0.25 + p * 6) * 2.5;
        const z = Math.sin(a) * base * rad * 0.6 + Math.cos(t * 0.18 + p2 * 5) * 1.8;

        targetPositions[i * 3] = x;
        targetPositions[i * 3 + 1] = y;
        targetPositions[i * 3 + 2] = z;

        // sage-tinted blue — matches the UI accent
        targetColors[i * 3]     = 0.02 * brightness;
        targetColors[i * 3 + 1] = 0.06 * brightness;
        targetColors[i * 3 + 2] = 0.12 * brightness;
        targetSizes[i] = 0.12 + brightness * 0.25;
    }
}
