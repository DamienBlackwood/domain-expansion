import { TAU } from '../utils.js';
import { phases, phases2 } from '../engine/particles.js';

// Shared radial-flow field — Blue and Red are the same machinery with direction flipped.
// Golden-angle + random-y sphere so particles fill a real sphere with no lanes.
// direction: -1 = inflow (Blue), +1 = outflow (Red)

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function rayDir(i, p2, out) {
    const y = 1 - 2 * p2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * GOLDEN;
    out.x = Math.cos(th) * radial;
    out.y = y;
    out.z = Math.sin(th) * radial;
}

const _dir = { x: 0, y: 0, z: 0 };

export function radialField(i, t, opts, res) {
    const { direction, reach, speed, swirl = 0, jagged = 0, accel = 1.6 } = opts;
    const p = phases[i];
    const p2 = phases2[i];

    rayDir(i, p2, _dir);

    let flow = (p + t * speed) % 1;
    const eased = Math.pow(flow, accel);

    let dist;
    if (direction < 0) {
        dist = (1 - eased) * reach + 1.5;        // shrink toward core
    } else {
        dist = eased * reach + 1.5;              // grow away from core
    }

    if (jagged > 0) {
        dist += Math.sin(p * 53.0 + t * 9.0) * reach * 0.06 * jagged * eased;
    }

    let x = _dir.x * dist;
    let y = _dir.y * dist * 0.92;
    let z = _dir.z * dist;

    // swirl tightens near the core for a curved infall path
    if (swirl !== 0) {
        const tighten = 1 - dist / (reach + 1.5);
        const ang = swirl * tighten * tighten * (2.4 + p2 * 1.2) * direction * -1;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const nx = x * ca - z * sa;
        const nz = x * sa + z * ca;
        x = nx; z = nz;
    }

    const energy = direction < 0 ? eased : (1 - eased);
    res.x = x; res.y = y; res.z = z; res.energy = energy;
}

// core cloud — three independent seeds per particle (radius/azimuth/polar).
// correlating them from phases[] carved a rotating crescent artifact.
// cube-root radius keeps volume density even.
function hash01(n) {
    // integer hash → [0,1)
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ (n >>> 15);
    return (n >>> 0) / 4294967296;
}
export function coreCloud(i, t, radius, res) {
    const sR  = hash01(i * 3 + 1);
    const sAz = hash01(i * 3 + 2);
    const sPo = hash01(i * 3 + 3);
    const th = sAz * TAU + t;
    const ph = Math.acos(2 * sPo - 1);
    const rad = Math.cbrt(sR) * radius;
    res.x = rad * Math.sin(ph) * Math.cos(th);
    res.y = rad * Math.sin(ph) * Math.sin(th) * 0.92;
    res.z = rad * Math.cos(ph) * 0.92;
    res.depth = rad / (radius + 1e-6);
}
