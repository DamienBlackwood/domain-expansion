import * as THREE from 'three';
import { COUNT, TAU, easeOutCubic } from '../utils.js';
import { targetPositions, targetColors, targetSizes, phases, phases2 } from '../engine/particles.js';
import { state } from '../state.js';

export const releaseFx = {
    active: false,
    tech: 'neutral',
    age: 0,
    duration: 1.2,
    dir: new THREE.Vector3(0, 0, -1),
    burst: 0,
};

function getReleaseColor(tech, alpha) {
    if (tech === 'red') {
        const heat = alpha * alpha;
        return { r: 1.05 + heat * 1.15, g: 0.02 + heat * 0.52, b: 0.01 + heat * 0.44 };
    }
    if (tech === 'blue') return { r: 0.02, g: 0.5 + alpha * 0.35, b: 1.1 + alpha * 1.2 };
    return { r: 0.5 + alpha * 0.8, g: 0.06 + alpha * 0.07, b: 0.9 + alpha * 1.0 };
}

export function triggerRelease(tech, dx, dy) {
    const v = new THREE.Vector3(dx * 2.2, -dy * 2.1, -0.55);
    if (v.lengthSq() < 1e-4) v.set(0.0, 0.0, -1.0);
    v.normalize();
    releaseFx.active = true;
    releaseFx.tech = tech;
    releaseFx.age = 0;
    releaseFx.dir.copy(v);
    releaseFx.burst = 1.0;
    state.shakeDecay = Math.max(state.shakeDecay, 1.25);
}

export function applyReleaseOverlay(dt) {
    if (!releaseFx.active) return;

    releaseFx.age += dt;
    const p = releaseFx.age / releaseFx.duration;
    if (p >= 1) {
        releaseFx.active = false;
        releaseFx.burst = 0;
        return;
    }

    releaseFx.burst *= 0.95;
    const dir = releaseFx.dir;
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();

    const head = easeOutCubic(p) * 118;
    const trailLen = 42 + p * 38;
    const releaseCount = Math.floor(COUNT * 0.33);

    for (let i = 0; i < releaseCount; i++) {
        const pct = i / releaseCount;
        const ph = phases[i];
        const ph2 = phases2[i];
        let along, radius, spin, glow;

        if (pct < 0.16) {
            const u = pct / 0.16;
            along = head + (ph2 - 0.5) * 2.8;
            radius = (1 - u) * (5.6 * (1 - p) + 1.4);
            spin = ph * TAU + p * 18;
            glow = 1 - u * 0.6;
        } else if (pct < 0.82) {
            const u = (pct - 0.16) / 0.66;
            along = head - u * trailLen + Math.sin(ph * 10 + p * 14) * 1.2;
            radius = (1 - u) * (5.2 * (1 - p) + 1.0) + Math.sin(ph2 * 9 + p * 8) * 0.6;
            spin = ph * TAU * 2.2 + u * 16 + p * 10;
            glow = (1 - u) * (1 - p * 0.35);
        } else {
            const u = (pct - 0.82) / 0.18;
            along = head + (u - 0.5) * 4;
            radius = 9 + u * 14 + p * 20;
            spin = ph * TAU + u * 8;
            glow = (1 - u) * (1 - p);
        }

        const c = Math.cos(spin);
        const s = Math.sin(spin);
        const radialX = right.x * radius * c + up.x * radius * s;
        const radialY = right.y * radius * c + up.y * radius * s;
        const radialZ = right.z * radius * c + up.z * radius * s;

        targetPositions[i * 3]     = dir.x * along + radialX;
        targetPositions[i * 3 + 1] = dir.y * along + radialY;
        targetPositions[i * 3 + 2] = dir.z * along + radialZ;

        const tint = getReleaseColor(releaseFx.tech, glow);
        targetColors[i * 3]     = tint.r;
        targetColors[i * 3 + 1] = tint.g;
        targetColors[i * 3 + 2] = tint.b;
        targetSizes[i] = 0.8 + glow * (2.4 - p * 1.1);
    }
}
