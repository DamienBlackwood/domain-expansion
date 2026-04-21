import { COUNT, TAU, clamp01 } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases, phases2 } from '../engine/particles.js';

const SHRINE_BUILDUP_SECONDS = 6;
export { SHRINE_BUILDUP_SECONDS };

export function animateShrine(t) {
    const build = clamp01(t / SHRINE_BUILDUP_SECONDS);
    const sm = x => x * x * (3 - 2 * x);

    const eGround  = sm(clamp01((build - 0.00) / 0.18));
    const eGate    = sm(clamp01((build - 0.12) / 0.22));
    const eCrackle = sm(clamp01((build - 0.28) / 0.22));
    const eEmbers  = sm(clamp01((build - 0.40) / 0.20));
    const eHaze    = sm(clamp01((build - 0.55) / 0.20));
    const eSky     = sm(clamp01((build - 0.70) / 0.30));

    // torii dimensions — make it MASSIVE and imposing
    const pillarSpacing = 14;
    const pillarHeight  = 36;
    const beamY1 = 30;  // top curved crossbeam
    const beamY2 = 24;  // lower crossbeam
    const baseY  = -22;

    const baseR = 0.08, baseG = 0.004, baseB = 0.0, baseS = 0.18;

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i], pct = i / COUNT;
        let x, y, z, r, g, b, s, reveal;
        let sx = 0, sy = baseY, sz = 0;

        if (pct < 0.18) {
            // ground — cursed energy spreading outward, cracking the earth
            const a  = p * TAU * 3.1 + t * 0.12;
            const rad = 2 + Math.pow(p2, 0.6) * 72;
            const ripple = Math.sin(rad * 0.18 + t * 2.2 + p * 8) * 0.6;
            x = Math.cos(a) * rad;
            z = Math.sin(a) * rad * 0.55;
            y = baseY + ripple + p2 * 2.5;
            const dist01 = rad / 72;
            const pulse = 0.7 + 0.3 * Math.sin(t * 3 + p * 12);
            r = (0.9 - dist01 * 0.7) * pulse;
            g = (0.12 - dist01 * 0.1) * pulse;
            b = 0.02;
            s = (1.0 - dist01 * 0.6) * pulse + 0.2;
            sx = Math.cos(a) * 4; sy = baseY; sz = Math.sin(a) * 2;
            reveal = eGround;

        } else if (pct < 0.40) {
            // torii gate — LARGE and bright, dark red-black with glowing edges
            const structIdx = Math.floor(p * 6);
            const sway = Math.sin(t * 0.25 + structIdx * 0.7) * 0.4;
            const edgeGlow = 0.5 + 0.5 * Math.sin(t * 1.8 + p * 9);

            if (structIdx < 2) {
                // pillars — tall and thick
                const side = structIdx === 0 ? -1 : 1;
                const h = p2 * pillarHeight;
                const thick = 1.8;
                x = side * pillarSpacing + (p2 - 0.5) * thick + sway;
                y = baseY + h;
                z = (Math.sin(p * 13 + structIdx * 2) - 0.5) * 1.4;
                // bright hot glow at edges, dark core
                const edge = Math.abs(p2 - 0.5) * 2;
                r = 0.35 + edge * 0.6 + edgeGlow * 0.15;
                g = 0.02 + edge * 0.04;
                b = 0.01;
                s = 0.9 + edge * 0.8;
            } else if (structIdx === 2) {
                // top crossbeam — wide, curves up at ends
                const w = (p2 - 0.5) * (pillarSpacing * 2 + 10);
                x = w + sway;
                y = baseY + beamY1 + Math.abs(w) * 0.06;
                z = (p - 0.5) * 2.0;
                const edge = Math.abs(p2 - 0.5) * 2;
                r = 0.4 + edge * 0.5 + edgeGlow * 0.2;
                g = 0.025 + edge * 0.03;
                b = 0.01;
                s = 1.0 + edge * 0.7;
            } else if (structIdx === 3) {
                // lower crossbeam
                const w = (p2 - 0.5) * (pillarSpacing * 2 + 4);
                x = w + sway;
                y = baseY + beamY2;
                z = (p - 0.5) * 1.4;
                r = 0.3 + edgeGlow * 0.2;
                g = 0.02;
                b = 0.01;
                s = 0.8 + edgeGlow * 0.3;
            } else if (structIdx === 4) {
                // kasagi — decorative caps on top of pillars
                const side = p2 < 0.5 ? -1 : 1;
                const capW = (p - 0.5) * 5;
                x = side * pillarSpacing + capW + sway;
                y = baseY + pillarHeight + Math.abs(capW) * 0.05;
                z = (p2 - 0.5) * 1.0;
                r = 0.5 + edgeGlow * 0.3; g = 0.03; b = 0.01;
                s = 1.1 + edgeGlow * 0.4;
            } else {
                // korobi — small roof ridge at very top
                const w = (p2 - 0.5) * (pillarSpacing * 1.4);
                x = w + sway;
                y = baseY + pillarHeight + 2 + Math.abs(w) * 0.08;
                z = (p - 0.5) * 0.8;
                r = 0.6 + edgeGlow * 0.4; g = 0.04; b = 0.015;
                s = 1.2 + edgeGlow * 0.5;
            }

            sx = 0; sy = baseY - 5; sz = 0;
            reveal = eGate;

        } else if (pct < 0.54) {
            // cursed energy crackling up the gate pillars — arcing electricity
            const u = (pct - 0.40) / 0.14;
            const side = p < 0.5 ? -1 : 1;
            const pp = (p * 2) % 1; // local phase per side
            // arc: starts at pillar, crackles outward then snaps back
            const h = pp * pillarHeight;
            const crackle = Math.sin(t * 8 + pp * 18 + p * 30) * (3 + (1 - h / pillarHeight) * 4);
            const branch = Math.sin(t * 12 + pp * 25 + p2 * 20) * 2;
            x = side * pillarSpacing + crackle;
            y = baseY + h;
            z = branch;
            const spark = Math.max(0, Math.sin(t * 6 + p * 15 + p2 * 10));
            r = 0.8 + spark * 0.8;
            g = 0.05 + spark * 0.1;
            b = 0.02;
            s = 0.3 + spark * 1.2;
            sx = side * pillarSpacing; sy = baseY; sz = 0;
            reveal = eCrackle;

        } else if (pct < 0.68) {
            // embers — dense, fast, bright orange cascading up
            const baseX = (p - 0.5) * 80 + Math.sin(p2 * 11) * 18;
            const risePhase = (p2 + t * (0.12 + p * 0.09)) % 1;
            x = baseX + Math.sin(t * 1.2 + p * 9) * (1.5 + risePhase * 4);
            y = baseY + risePhase * 70;
            z = Math.sin(p * 17 + p2 * 8) * 18;
            const fade = Math.sin(risePhase * Math.PI);
            const heat = Math.pow(1 - risePhase, 0.6);
            r = 1.1 * fade * heat + 0.1;
            g = 0.25 * fade * heat;
            b = 0.02 * fade * heat;
            s = 0.25 + fade * 0.8;
            sx = baseX * 0.05; sy = baseY - 5; sz = 0;
            reveal = eEmbers;

        } else if (pct < 0.82) {
            // atmospheric cursed haze — mid-height billowing clouds of dark energy
            const a = p * TAU + t * 0.06;
            const rad = 10 + p2 * 55;
            const drift = Math.sin(t * 0.18 + p * 3.5) * 4;
            x = Math.cos(a) * rad + drift;
            y = baseY + 8 + ((pct - 0.68) / 0.14) * 35 + Math.sin(t * 0.25 + p2 * 5) * 4;
            z = Math.sin(a) * rad * 0.45;
            const swirl = 0.6 + 0.4 * Math.sin(t * 0.9 + p * 7);
            r = 0.15 * swirl; g = 0.01 * swirl; b = 0.005 * swirl;
            s = 0.3 + p2 * 0.25;
            sx = Math.cos(a) * 6; sy = baseY; sz = Math.sin(a) * 3;
            reveal = eHaze;

        } else {
            // sky — dark storm with frequent red lightning glints
            const a = p * TAU * 2.2 + t * 0.04;
            const rad = 25 + p2 * 90;
            const elev = 15 + p * 65 + Math.sin(t * 0.22 + p2 * 4) * 5;
            x = Math.cos(a) * rad;
            z = Math.sin(a) * rad * 0.5;
            y = elev;
            // frequent glints — more lightning in the sky
            const glint1 = Math.max(0, Math.sin(t * 2.5 + p * 18 + p2 * 12) - 0.6) * 2.5;
            const glint2 = Math.max(0, Math.sin(t * 3.1 + p2 * 22 + p * 7) - 0.75) * 4;
            const glint = Math.max(glint1, glint2);
            r = 0.06 + glint * 0.9;
            g = 0.008 + glint * 0.06;
            b = 0.003;
            s = 0.2 + glint * 0.7;
            sx = Math.cos(a) * 8; sy = 8; sz = Math.sin(a) * 4;
            reveal = eSky;
        }

        targetPositions[i * 3]     = sx + (x - sx) * reveal;
        targetPositions[i * 3 + 1] = sy + (y - sy) * reveal;
        targetPositions[i * 3 + 2] = sz + (z - sz) * reveal;
        targetColors[i * 3]     = baseR + (r - baseR) * reveal;
        targetColors[i * 3 + 1] = baseG + (g - baseG) * reveal;
        targetColors[i * 3 + 2] = baseB + (b - baseB) * reveal;
        targetSizes[i] = baseS + (s - baseS) * reveal;
    }
}
