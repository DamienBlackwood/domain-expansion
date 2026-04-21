import { COUNT, TAU } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases, phases2 } from '../engine/particles.js';

export function animateBlue(t) {
    // intro blend — form over first 1.2s
    const form = Math.min(1, t / 1.2);
    const blend = form * form * (3 - 2 * form);
    const breathe = 1 + Math.sin(t * 2.8) * 0.07;

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i], pct = i / COUNT;
        let x, y, z, r, g, b, s;

        if (pct < 0.28) {
            // the blue orb — compact bright sphere, white core, electric blue surface
            const th = p * TAU - t * 2.2;
            const ph = Math.acos(2 * p2 - 1);
            const rad = Math.pow(p, 0.4) * 10 * breathe;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th) * 0.9;
            z = rad * Math.cos(ph) * 0.9;
            const depth = rad / (10 * breathe);
            r = 0.6 + (1 - depth) * 0.4;
            g = 0.6 + (1 - depth) * 0.2;
            b = 1.6 + (1 - depth) * 0.3;
            s = 0.8 + (1 - depth) * 2.4;
        } else if (pct < 0.62) {
            // particles being pulled inward — flows converging on the orb
            const laneCount = 6;
            const lane = i % laneCount;
            const baseAngle = (lane / laneCount) * TAU;
            const flow = (p + t * 0.14) % 1;
            // starts far, ends at orb surface
            const dist = (1 - flow) * 55 * breathe + 2;
            const angle = baseAngle - t * 0.4 + flow * 3.0;
            // slight vertical spread, not flat
            const vertOff = Math.sin(p2 * TAU + lane) * dist * 0.15;
            x = Math.cos(angle) * dist;
            y = Math.sin(angle) * dist * 0.55 + vertOff;
            z = (p2 - 0.5) * (1 - flow) * 8;
            // dims far away, blazes as it hits
            const energy = flow * flow;
            r = energy * 0.15;
            g = 0.04 + energy * 0.25;
            b = 0.15 + energy * 1.2;
            s = 0.15 + energy * 1.4;
        } else if (pct < 0.80) {
            // outer concentric ring glow — rings around the orb, not tendrils
            const ringCount = 5;
            const ring = Math.floor(p2 * ringCount);
            const ringR = (14 + ring * 8) * breathe;
            const speed = 0.25 * (ring % 2 === 0 ? 1 : -1);
            const a = p * TAU + t * speed;
            x = Math.cos(a) * ringR;
            y = Math.sin(a) * ringR * 0.5;
            z = Math.sin(a * 1.5 + t * 0.5 + ring) * 1.2;
            const glow = 1 - ring / ringCount;
            r = 0.01; g = 0.05 + glow * 0.15; b = 0.2 + glow * 0.55;
            s = 0.28 + glow * 0.4;
        } else {
            // sparse outer blue mist — just dim scattered points, no coral shape
            const th = p * TAU - t * 0.12;
            const ph = Math.acos(2 * p2 - 1);
            const rad = 28 + Math.pow(p, 0.6) * 38;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.cos(ph) * 0.55;
            z = rad * Math.sin(ph) * Math.sin(th) * 0.55;
            r = 0.0; g = 0.03; b = 0.12 + p * 0.15;
            s = 0.28;
        }

        // intro: bloom out from center
        const sx = 0, sy = 0, sz = 0;
        targetPositions[i * 3]     = sx + (x - sx) * blend;
        targetPositions[i * 3 + 1] = sy + (y - sy) * blend;
        targetPositions[i * 3 + 2] = sz + (z - sz) * blend;
        targetColors[i * 3] = r;
        targetColors[i * 3 + 1] = g;
        targetColors[i * 3 + 2] = b;
        targetSizes[i] = s;
    }
}
