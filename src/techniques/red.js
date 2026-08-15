import { COUNT, smoothstep } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases } from '../engine/particles.js';
import { radialField, coreCloud } from './field.js';

const _f = { x: 0, y: 0, z: 0, energy: 0 };
const _c = { x: 0, y: 0, z: 0, depth: 0 };
const _optsMid = { direction: 1, reach: 0, speed: 0.2, swirl: 0.15, jagged: 1.0, accel: 1.4 };
const _optsOuter = { direction: 1, reach: 74, speed: 0.03, accel: 0.8 };

export function animateRed(t) {
    const form = Math.min(1, t / 1.0);
    const blend = smoothstep(0, 1, form);
    const pulse = 1 + Math.sin(t * 4.2) * 0.09;
    _optsMid.reach = 50 * pulse;

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], pct = i / COUNT;
        let x, y, z, r, g, b, s;

        if (pct < 0.26) {
            coreCloud(i, t * 1.1, 7 * pulse, _c);
            x = _c.x; y = _c.y; z = _c.z;
            const core = 1 - _c.depth;
            r = 1.4 + core * 0.9;
            g = 0.18 + core * 0.55;
            b = 0.12 + core * 0.35;
            s = 0.7 + core * 2.0;
        } else if (pct < 0.84) {
            radialField(i, t, _optsMid, _f);
            x = _f.x; y = _f.y; z = _f.z;
            const e = _f.energy;
            const flare = 0.6 + 0.4 * Math.sin(p * 71.0 + t * 6.0);
            r = (0.7 + e * 1.1) * flare;
            g = e * e * 0.12 * flare;
            b = e * e * 0.04 * flare;
            s = 0.16 + e * 1.2 * flare;
        } else {
            radialField(i, t * 0.3, _optsOuter, _f);
            x = _f.x; y = _f.y; z = _f.z;
            r = 0.14 + p * 0.1; g = 0.0; b = 0.0;
            s = 0.3;
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
