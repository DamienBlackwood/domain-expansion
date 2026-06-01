import { COUNT, TAU } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases, phases2 } from '../engine/particles.js';

export function animatePurple(t) {
    const spin = t * 2.2;

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i], pct = i / COUNT;
        let x, y, z, r, g, b, s;

        if (pct < 0.08) {
            const th = p * TAU + t * 4.0;
            const ph = Math.acos(2 * p2 - 1);
            const pulse = 1 + Math.sin(t * 6) * 0.25;
            const rad = p * 3.2 * pulse;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th) * 0.72;
            z = rad * Math.cos(ph);
            const depth = Math.min(1, rad / (3.2 * pulse));
            r = 1.0 - depth * 0.25;
            g = 0.85 - depth * 0.5;
            b = 1.4 - depth * 0.2;
            s = 3.2 + (1 - depth) * 1.2 + Math.sin(t * 6 + p * 8) * 0.4;
        } else if (pct < 0.68) {
            const u = (pct - 0.08) / 0.60;
            const ringIdx = Math.floor(u * 7);
            const ringFrac = (ringIdx + 1) / 8;
            const maxR = 38;
            const ringR = 4 + ringFrac * (maxR - 4);

            const speedMult = 2.8 - ringFrac * 1.8;
            const dir = ringIdx % 2 === 0 ? 1 : -1;
            const a = p * TAU + spin * speedMult * dir;

            const jitter = Math.sin(i * 2.7 + t * 3 + ringIdx) * (ringR * 0.07);
            const finalR = ringR + jitter;

            x = Math.cos(a) * finalR;
            y = Math.sin(a) * finalR * 0.72;
            z = Math.sin(a * 1.5 + t + ringIdx) * 0.8;

            const twinkle = 0.55 + 0.45 * Math.sin(i * 0.9 + t * 4 + ringIdx);
            const innerGlow = 1 - ringFrac;
            r = (0.75 + innerGlow * 0.25) * twinkle;
            g = (0.37 + innerGlow * 0.15) * twinkle;
            b = (1.0 + innerGlow * 0.4) * twinkle;
            s = 0.6 + innerGlow * 0.9 + twinkle * 0.2;
        } else if (pct < 0.78) {
            const burst = ((t * 0.4 + p) % 1);
            const a = p2 * TAU;
            const rad = (0.75 + burst * 0.25) * 38;
            x = Math.cos(a) * rad;
            y = Math.sin(a) * rad * 0.72;
            z = (p - 0.5) * 4;
            const fade = 0.5 + 0.5 * Math.sin(t * 2.4 + p * 7);
            r = 1.0 * fade;
            g = 0.78 * fade;
            b = 1.0 * fade;
            s = 0.35 + fade * 0.3;
        } else if (pct < 0.90) {
            const a = p * TAU + t * 0.3;
            const rad = 32 + p2 * 18;
            x = Math.cos(a) * rad;
            y = Math.sin(a) * rad * 0.72;
            z = (p2 - 0.5) * 2;
            const fade = 1 - ((rad - 32) / 18) * 0.7;
            r = 0.3 * fade;
            g = 0.1 * fade;
            b = 0.5 * fade;
            s = 0.2 + fade * 0.15;
        } else {
            const th = p * TAU + t * 0.08;
            const ph = Math.acos(2 * p2 - 1);
            const rad = 30 + Math.pow(p, 0.5) * 50;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.cos(ph);
            z = rad * Math.sin(ph) * Math.sin(th);
            r = 0.06; g = 0.01; b = 0.1;
            s = 0.18;
        }

        targetPositions[i * 3] = x;
        targetPositions[i * 3 + 1] = y;
        targetPositions[i * 3 + 2] = z;
        targetColors[i * 3] = r;
        targetColors[i * 3 + 1] = g;
        targetColors[i * 3 + 2] = b;
        targetSizes[i] = s;
    }
}
