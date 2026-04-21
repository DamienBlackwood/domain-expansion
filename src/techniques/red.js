import { COUNT, TAU } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases, phases2 } from '../engine/particles.js';

export function animateRed(t) {
    const form = Math.min(1, t / 1.2);
    const blend = form * form * (3 - 2 * form);
    const pulse = 1 + Math.sin(t * 3.8) * 0.1;

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i], pct = i / COUNT;
        let x, y, z, r, g, b, s;

        if (pct < 0.30) {
            // the red orb — dense glowing sphere
            const th = p * TAU + t * 1.1;
            const ph = Math.acos(2 * p2 - 1);
            const rad = Math.pow(p, 0.4) * 11 * pulse;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th) * 0.9;
            z = rad * Math.cos(ph) * 0.9;
            const depth = rad / (11 * pulse);
            r = 1.8 + (1 - depth) * 0.7;
            g = 0.5 * Math.pow(1 - depth, 2);
            b = 0.3 * Math.pow(1 - depth, 2);
            s = 0.7 + (1 - depth) * 2.0;
        } else if (pct < 0.72) {
            // wispy wind trails — each particle is a point on a moving arc, not a full ring
            // divide into N distinct trails, each trail has particles along its length
            const TRAILS = 6;
            const trailIdx = i % TRAILS;
            const trailPct = Math.floor((i - Math.floor(COUNT * 0.30)) / TRAILS) / Math.floor((COUNT * 0.42) / TRAILS);

            // each trail has a fixed leading angle that rotates with time
            const trailBaseAngle = (trailIdx / TRAILS) * TAU;
            const inc = (trailIdx / TRAILS - 0.5) * Math.PI * 0.8;
            const orbitR = (13 + trailIdx * 2.0) * pulse;
            const leadAngle = trailBaseAngle + t * (0.9 + trailIdx * 0.12) * (trailIdx % 2 === 0 ? 1 : -1);

            // particles sit BEHIND the lead along the arc — making a tail not a ring
            const arcOffset = trailPct * (TAU * 0.55); // each trail covers ~200° arc max
            const a = leadAngle - arcOffset * (trailIdx % 2 === 0 ? 1 : -1);

            const cx = Math.cos(a) * orbitR;
            const cy = Math.sin(a) * orbitR;
            x = cx;
            y = cy * Math.cos(inc);
            z = cy * Math.sin(inc) * 0.45;

            // bright at lead, fades toward tail
            const bright = 1 - trailPct * 0.9;
            r = 0.8 + bright * 0.8;
            g = bright * 0.04;
            b = bright * 0.015;
            s = 0.15 + bright * 0.5;
        } else if (pct < 0.88) {
            // outer red atmospheric haze — spherical, not cylindrical
            const th = p * TAU + t * 0.1;
            const ph = Math.acos(2 * p2 - 1);
            const rad = 15 + p2 * 28;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.cos(ph) * 0.65;
            z = rad * Math.sin(ph) * Math.sin(th) * 0.65;
            r = 0.2 + p2 * 0.12; g = 0.0; b = 0.0;
            s = 0.3;
        } else {
            // dim red moon in background
            const th = p * TAU + t * 0.03;
            const ph = Math.acos(2 * p2 - 1);
            const rad = 52 + p * 18;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th) * 0.8;
            z = rad * Math.cos(ph) * 0.25 - 15;
            r = 0.1 + p2 * 0.08; g = 0.0; b = 0.0;
            s = 0.45;
        }

        targetPositions[i * 3]     = x * blend;
        targetPositions[i * 3 + 1] = y * blend;
        targetPositions[i * 3 + 2] = z * blend;
        targetColors[i * 3] = r;
        targetColors[i * 3 + 1] = g;
        targetColors[i * 3 + 2] = b;
        targetSizes[i] = s;
    }
}
