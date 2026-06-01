import { COUNT } from '../utils.js';
import { targetPositions, targetColors, targetSizes } from '../engine/particles.js';
import { radialField, coreCloud } from './field.js';

// Blue — space collapses inward along curved black-hole paths. Mirror of Red, same field, sign flipped.
const _f = { x: 0, y: 0, z: 0, energy: 0 };
const _c = { x: 0, y: 0, z: 0, depth: 0 };

export function animateBlue(t) {
    const form = Math.min(1, t / 1.2);
    const blend = form * form * (3 - 2 * form);
    const breathe = 1 + Math.sin(t * 2.4) * 0.05;

    for (let i = 0; i < COUNT; i++) {
        const pct = i / COUNT;
        let x, y, z, r, g, b, s;

        if (pct < 0.22) {
            // white-blue singularity — soft volumetric cloud, not a single texel
            coreCloud(i, t * 0.6, 6.5 * breathe, _c);
            x = _c.x; y = _c.y; z = _c.z;
            const core = 1 - _c.depth;
            r = 0.45 + core * 0.5;
            g = 0.62 + core * 0.35;
            b = 1.25 + core * 0.55;
            s = 0.6 + core * 1.8;
        } else if (pct < 0.82) {
            // the infall — particles streaming inward along curved rays
            radialField(i, t, { direction: -1, reach: 52 * breathe, speed: 0.16, swirl: 1.0, accel: 1.8 }, _f);
            x = _f.x; y = _f.y; z = _f.z;
            const e = _f.energy;          // blazes as it nears the core
            r = e * e * 0.35;
            g = 0.06 + e * 0.45;
            b = 0.22 + e * 1.25;
            s = 0.18 + e * e * 1.5;
        } else {
            // outer blue haze — sparse halo so the core has somewhere to fall from
            radialField(i, t * 0.4, { direction: -1, reach: 78, speed: 0.04, swirl: 0.3, accel: 1.0 }, _f);
            x = _f.x; y = _f.y; z = _f.z;
            r = 0.0; g = 0.04; b = 0.16;
            s = 0.26;
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
