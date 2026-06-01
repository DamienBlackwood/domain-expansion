import { COUNT, TAU, clamp01 } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases, phases2 } from '../engine/particles.js';

// Infinite Void — two acts on one buildup clock.
// A: speed-lines rush inward and blow to white (manga screentone burst).
// B: mandala settles — iris, god-rays, ink continents, drifting wisps.

const VOID_BUILDUP_SECONDS = 7.5;
export { VOID_BUILDUP_SECONDS };

const RUSH_END = 0.20;
const FLASH_END = 0.27;
const SPOKES = 90;   // enough spokes → reads as lines, not dots

export function animateVoid(t) {
    const build = clamp01(t / VOID_BUILDUP_SECONDS);

    const formed = clamp01((build - FLASH_END) / (1 - FLASH_END));
    const formS = formed * formed * (3 - 2 * formed);

    // white-out envelope — ramps through the rush, peaks at the flash, fades out
    const flash = build < RUSH_END
        ? clamp01(build / RUSH_END) * 0.55
        : build < FLASH_END
            ? 0.55 + clamp01((build - RUSH_END) / (FLASH_END - RUSH_END)) * 0.45
            : clamp01(1 - (build - FLASH_END) / 0.14);

    const revIris  = clamp01((formed - 0.00) / 0.30);
    const revRays  = clamp01((formed - 0.18) / 0.34);
    const revWisp  = clamp01((formed - 0.30) / 0.34);
    const revInk   = clamp01((formed - 0.42) / 0.40);
    const revField = clamp01((formed - 0.55) / 0.45);

    const rushProg = clamp01(build / RUSH_END);

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i];
        const p2 = phases2[i];
        const pct = i / COUNT;

        // act A: speed-lines — thin z-band so the slide lerps cleanly, no smear
        const spoke = i % SPOKES;
        const spokeAng = (spoke / SPOKES) * TAU;
        const inward = Math.pow(rushProg, 1.6);
        const lineDist = (8 + p * 78) * (1 - inward * 0.92);
        const rushX = Math.cos(spokeAng) * lineDist;
        const rushY = Math.sin(spokeAng) * lineDist * 0.96;
        const rushZ = (p2 - 0.5) * 6;                 // thin slab, faces camera
        const rushBright = 0.45 + rushProg * rushProg * 1.6;

        // act B: formed target
        let fx, fy, fz, fr, fg, fb, fs, layerReveal;

        if (pct < 0.10) {
            // pupil + iris — breathing ring shell
            const u = pct / 0.10;
            const breathe = 1 + Math.sin(t * 0.8) * 0.05;
            const ang = p * TAU + Math.sin(t * 0.5 + p2 * 6) * 0.08;
            const ring = (3.0 + u * 9.0) * breathe;
            const irisBand = Math.exp(-Math.pow((ring - 9.0 * breathe) / 2.2, 2));
            fx = Math.cos(ang) * ring;
            fy = Math.sin(ang) * ring * 0.92;
            fz = Math.sin(ang * 1.3 + t * 0.5) * 1.4;
            fr = irisBand * 1.3;
            fg = irisBand * 1.7;
            fb = 0.25 + irisBand * 2.0;
            fs = 0.5 + irisBand * 1.8;
            layerReveal = revIris;

        } else if (pct < 0.34) {
            // god-rays — spokes that slowly rotate + shimmer, never frozen
            const RAYS = 28;
            const ray = i % RAYS;
            const along = (pct - 0.10) / 0.24;
            const rayAng = (ray / RAYS) * TAU + t * 0.06 + Math.sin(t * 0.4 + ray) * 0.05;
            const dist = 11 + along * 64 + Math.sin(t * 0.7 + p * 8) * 2.0; // breathing length
            const jitter = (p2 - 0.5) * (1.2 + along * 2.0);
            fx = Math.cos(rayAng) * dist + Math.cos(rayAng + 1.57) * jitter;
            fy = (Math.sin(rayAng) * dist + Math.sin(rayAng + 1.57) * jitter) * 0.92;
            fz = (p - 0.5) * 4;
            const fade = 1 - along * 0.8;
            const flick = 0.6 + 0.4 * Math.sin(p * 40 + t * 3.0); // brighter shimmer
            fr = (0.6 + fade * 0.6) * flick;
            fg = (0.7 + fade * 0.7) * flick;
            fb = (1.0 + fade * 0.8) * flick;
            fs = (0.2 + fade * 0.7) * flick;
            layerReveal = revRays;

        } else if (pct < 0.46) {
            // smoky wisps — flowing curls around the iris
            const ang = p * TAU + t * 0.32;
            const rad = 13 + p2 * 22;
            const curl = Math.sin(rad * 0.3 + t * 1.1 + p * 9) * 5.0;
            fx = Math.cos(ang) * (rad + curl);
            fy = Math.sin(ang) * (rad + curl) * 0.7;
            fz = Math.sin(ang * 1.4 + t * 0.7) * 4.0;
            const mist = 0.4 + 0.3 * Math.sin(p * 12 + t * 1.3);
            fr = 0.22 * mist; fg = 0.30 * mist; fb = 0.55 * mist;
            fs = 0.4 + mist * 0.5;
            layerReveal = revWisp;

        } else if (pct < 0.74) {
            // ink-splatter "continents" — now DRIFTING + MORPHING, not static.
            // each blob slowly orbits and breathes so the field feels alive/airy
            const blob = Math.floor(p * 14);
            const bphase = blob * 1.37;
            const blobAng = (blob / 14) * TAU + (((blob * 97) % 100) / 100 - 0.5)
                          + Math.sin(t * 0.12 + bphase) * 0.18;          // slow orbit
            const blobR = (34 + ((blob * 53) % 100) / 100 * 30)
                        + Math.sin(t * 0.18 + bphase) * 6.0;             // breathe in/out
            const bcx = Math.cos(blobAng) * blobR;
            const bcy = Math.sin(blobAng) * blobR * 0.7;
            // morph the splatter shape over time so edges shift like drifting ink
            const morph = 1 + Math.sin(t * 0.25 + p2 * 9 + bphase) * 0.22;
            const spread = Math.pow(p2, 0.6) * (8 + ((blob * 31) % 100) / 100 * 10) * morph;
            const sa = p2 * TAU * 7 + blob + t * 0.15;
            fx = bcx + Math.cos(sa) * spread;
            fy = bcy + Math.sin(sa) * spread;
            fz = -34 - p * 14 + Math.sin(t * 0.2 + bphase) * 4.0;        // gentle depth drift
            const edge = clamp01(1 - spread / 18);
            const shimmer = 0.85 + 0.15 * Math.sin(t * 0.6 + p * 20);
            fr = (0.7 + edge * 0.5) * shimmer;
            fg = (0.78 + edge * 0.45) * shimmer;
            fb = (0.9 + edge * 0.4) * shimmer;
            fs = 0.4 + edge * 1.0;
            layerReveal = revInk;

        } else {
            // outer cold field — drifting blue dust + occasional bright star
            const phi = Math.acos(1 - 2 * p);
            const theta = p2 * TAU + t * 0.05;
            const rad = 60 + Math.pow(p, 0.5) * 50 + Math.sin(t * 0.15 + p * 7) * 3.0;
            fx = rad * Math.sin(phi) * Math.cos(theta);
            fy = rad * Math.cos(phi) * 0.6;
            fz = rad * Math.sin(phi) * Math.sin(theta) - 10;
            const star = Math.pow(p2, 8);
            const twinkle = 0.7 + 0.3 * Math.sin(t * 1.5 + p * 30);
            fr = (0.02 + star * 0.7) * twinkle;
            fg = (0.03 + star * 0.8) * twinkle;
            fb = (0.08 + star * 1.0) * twinkle;
            fs = 0.25 + star * 1.3;
            layerReveal = revField;
        }

        const toFormed = formS * layerReveal;
        const x = rushX + (fx - rushX) * toFormed;
        const y = rushY + (fy - rushY) * toFormed;
        const z = rushZ + (fz - rushZ) * toFormed;

        let r = rushBright * (1 - toFormed) + fr * toFormed;
        let g = rushBright * (1 - toFormed) + fg * toFormed;
        let b = (rushBright + 0.4) * (1 - toFormed) + fb * toFormed;
        let s = (0.35 + rushProg * 1.3) * (1 - toFormed) + fs * toFormed;

        if (flash > 0.001) {
            r += flash * 1.6; g += flash * 1.7; b += flash * 1.9;
            s += flash * 0.7;
        }

        targetPositions[i * 3]     = x;
        targetPositions[i * 3 + 1] = y;
        targetPositions[i * 3 + 2] = z;
        targetColors[i * 3]     = r;
        targetColors[i * 3 + 1] = g;
        targetColors[i * 3 + 2] = b;
        targetSizes[i] = s;
    }
}
