import { TAU, COUNT, polarFromUniform } from '../utils.js';
import { phases, phases2, phaseGen } from '../engine/particles.js';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// ray directions only depend on (i, phases2[i]), both fixed until the next initPhases()
// reseed — cache them instead of recomputing cos/sin/sqrt for every particle every frame
const dirX = new Float32Array(COUNT);
const dirY = new Float32Array(COUNT);
const dirZ = new Float32Array(COUNT);
let cachedGen = -1;

function rebuildDirs() {
    for (let i = 0; i < COUNT; i++) {
        const y = 1 - 2 * phases2[i];
        const radial = Math.sqrt(Math.max(0, 1 - y * y));
        const th = i * GOLDEN;
        dirX[i] = Math.cos(th) * radial;
        dirY[i] = y;
        dirZ[i] = Math.sin(th) * radial;
    }
    cachedGen = phaseGen;
}

export function radialField(i, t, opts, res) {
    if (cachedGen !== phaseGen) rebuildDirs();
    const { direction, reach, speed, swirl = 0, jagged = 0, accel = 1.6 } = opts;
    const p = phases[i];
    const p2 = phases2[i];

    let flow = (p + t * speed) % 1;
    const eased = Math.pow(flow, accel);

    let dist;
    if (direction < 0) {
        dist = (1 - eased) * reach + 1.5;
    } else {
        dist = eased * reach + 1.5;
    }

    if (jagged > 0) {
        dist += Math.sin(p * 53.0 + t * 9.0) * reach * 0.06 * jagged * eased;
    }

    let x = dirX[i] * dist;
    let y = dirY[i] * dist * 0.92;
    let z = dirZ[i] * dist;

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

export function hash01(n) {
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
    const ph = polarFromUniform(sPo);
    const rad = Math.cbrt(sR) * radius;
    res.x = rad * Math.sin(ph) * Math.cos(th);
    res.y = rad * Math.sin(ph) * Math.sin(th) * 0.92;
    res.z = rad * Math.cos(ph) * 0.92;
    res.depth = rad / (radius + 1e-6);
}
