import { COUNT, TAU, clamp01 } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases, phases2, voidBg } from '../engine/particles.js';

const VOID_BUILDUP_SECONDS = 7.5;
export { VOID_BUILDUP_SECONDS };

export function animateVoid(t) {
    const build = clamp01(t / VOID_BUILDUP_SECONDS);
    const revealCore   = clamp01((build - 0.00) / 0.22);
    const revealDisk   = clamp01((build - 0.12) / 0.28);
    const revealNebula = clamp01((build - 0.34) / 0.32);
    const revealShell  = clamp01((build - 0.58) / 0.42);

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i];
        const p2 = phases2[i];
        const pct = i / COUNT;

        let x, y, z, r, g, b, s, reveal;

        const seedA = p * TAU + t * 0.45;
        const seedR = 2.0 + p2 * 5.0;
        const sx = Math.cos(seedA) * seedR;
        const sy = (p2 - 0.5) * 8.0;
        const sz = Math.sin(seedA) * seedR;

        const baseR = 0.015, baseG = 0.03, baseB = 0.10, baseS = 0.18;

        if (pct < 0.12) {
            const phi = Math.acos(1 - 2 * p);
            const theta = p2 * TAU + t * 0.9;
            const radius = 5.5 + Math.sin(t * 1.7 + p * 14.0) * 0.45;

            x = radius * Math.sin(phi) * Math.cos(theta);
            y = radius * Math.cos(phi) * 0.82;
            z = radius * Math.sin(phi) * Math.sin(theta);

            const pulse = 0.75 + 0.25 * Math.sin(t * 2.4 + p * 10.0);
            r = 1.55 * pulse;
            g = 1.8 * pulse;
            b = 2.3 * pulse;
            s = 2.1 - p * 0.35;
            reveal = 0.14 + revealCore * 0.86;

        } else if (pct < 0.42) {
            const u = (pct - 0.12) / 0.30;
            const arm = Math.floor(p * 3.0);
            const armOffset = arm * (TAU / 3.0);

            const dist = 8.0 + Math.pow(p2, 1.15) * 34.0;
            const swirl = armOffset - dist * 0.11 + t * (0.95 / Math.sqrt(dist));
            const thickness = (p - 0.5) * dist * 0.15;
            const wobble = Math.sin(dist * 0.35 + t * 0.8 + p * 12.0) * 1.6 * u;

            x = Math.cos(swirl) * dist + Math.cos(swirl * 2.1) * 1.2;
            y = thickness + wobble;
            z = Math.sin(swirl) * dist * 0.88;

            const heat = 1.0 - (dist - 8.0) / 34.0;
            r = 0.18 + heat * 0.78;
            g = 0.34 + heat * 1.05;
            b = 1.05 + heat * 1.45;
            s = 0.95 + heat * 1.05;
            reveal = 0.05 + revealDisk * 0.95;

        } else if (pct < 0.76) {
            const phi = Math.acos(1 - 2 * p);
            const theta = p2 * TAU + t * 0.12;
            const radius = 24.0 + Math.pow(Math.abs(p - 0.5) * 2.0, 0.85) * 48.0;
            const noise = Math.sin(p * 21.0 + t) * Math.cos(p2 * 16.0 - t * 0.55) * 7.5;

            x = (radius + noise) * Math.sin(phi) * Math.cos(theta);
            y = (radius + noise) * Math.cos(phi) * 0.62;
            z = (radius + noise) * Math.sin(phi) * Math.sin(theta);

            const mix = 0.5 + 0.5 * Math.sin(p * 9.0 + p2 * 11.0);
            r = 0.18 + mix * 0.18;
            g = 0.07 + mix * 0.07;
            b = 0.68 + mix * 0.34;
            s = 0.72 + p2 * 1.05;
            reveal = revealNebula;

        } else {
            const phi = Math.acos(1 - 2 * p);
            const theta = p2 * TAU + t * 0.04;
            const radius = 84.0;
            const crack = Math.max(0, Math.sin(p * 56.0 + t * 4.5) - 0.94) * 10.0;

            const px = (radius + crack) * Math.sin(phi) * Math.cos(theta);
            const py = (radius + crack) * Math.cos(phi);
            const pz = (radius + crack) * Math.sin(phi) * Math.sin(theta);

            voidBg[i * 3] = px;
            voidBg[i * 3 + 1] = py;
            voidBg[i * 3 + 2] = pz;

            const drift = t * 0.08 + p * TAU;
            x = px + Math.sin(drift) * 1.8;
            y = py + Math.cos(drift * 1.2) * 1.8;
            z = pz + Math.sin(drift * 0.6) * 1.8;

            const star = Math.pow(p2, 9.0);
            r = 0.015 + star * 0.75;
            g = 0.018 + star * 0.85;
            b = 0.04 + star * 1.15;
            s = 0.35 + star * 1.5;
            reveal = revealShell;
        }

        targetPositions[i * 3] = sx + (x - sx) * reveal;
        targetPositions[i * 3 + 1] = sy + (y - sy) * reveal;
        targetPositions[i * 3 + 2] = sz + (z - sz) * reveal;

        targetColors[i * 3] = baseR + (r - baseR) * reveal;
        targetColors[i * 3 + 1] = baseG + (g - baseG) * reveal;
        targetColors[i * 3 + 2] = baseB + (b - baseB) * reveal;

        targetSizes[i] = baseS + (s - baseS) * reveal;
    }
}