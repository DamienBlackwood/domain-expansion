import * as THREE from 'three';
import { COUNT, TAU } from '../utils.js';
import { vertexShader, fragmentShader } from './shaders.js';
import { scene } from './scene.js';

export const positions       = new Float32Array(COUNT * 3);
export const colors          = new Float32Array(COUNT * 3);
export const sizes           = new Float32Array(COUNT);
export const targetPositions = new Float32Array(COUNT * 3);
export const targetColors    = new Float32Array(COUNT * 3);
export const targetSizes     = new Float32Array(COUNT);

export const phases  = new Float32Array(COUNT);
export const phases2 = new Float32Array(COUNT);

export function initPhases() {
    for (let i = 0; i < COUNT; i++) { phases[i] = Math.random(); phases2[i] = Math.random(); }
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
});

export function setShaderTime(t) { mat.uniforms.uTime.value = t; }

const particles = new THREE.Points(geo, mat);
particles.frustumCulled = false;
scene.add(particles);

export { geo };

// void background shell positions
export const voidBg = new Float32Array(COUNT * 3);

// stream basis vectors shared by void, blue, purple
const streamDirs = [];
for (let s = 0; s < 12; s++) {
    const ang = (s / 12) * TAU;
    const elev = ((s % 3) - 1) * 0.34;
    const base = Math.cos(elev);
    streamDirs.push({
        x: Math.cos(ang) * base,
        y: Math.sin(elev),
        z: Math.sin(ang) * base,
    });
}
export const streamBasis = streamDirs.map(v => {
    const dir = new THREE.Vector3(v.x, v.y, v.z).normalize();
    const ref = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(ref, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    return {
        dir:   { x: dir.x, y: dir.y, z: dir.z },
        right: { x: right.x, y: right.y, z: right.z },
        up:    { x: up.x, y: up.y, z: up.z },
    };
});

export function lerpParticles(lerpRate) {
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color.array;
    const siz = geo.attributes.size.array;
    const lr = lerpRate;
    for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        pos[i3]   += (targetPositions[i3]   - pos[i3])   * lr;
        pos[i3+1] += (targetPositions[i3+1] - pos[i3+1]) * lr;
        pos[i3+2] += (targetPositions[i3+2] - pos[i3+2]) * lr;
        col[i3]   += (targetColors[i3]   - col[i3])   * lr;
        col[i3+1] += (targetColors[i3+1] - col[i3+1]) * lr;
        col[i3+2] += (targetColors[i3+2] - col[i3+2]) * lr;
        siz[i]    += (targetSizes[i]      - siz[i])    * lr;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate    = true;
    geo.attributes.size.needsUpdate     = true;
}

export function snapToTarget() {
    geo.attributes.position.array.set(targetPositions);
    geo.attributes.color.array.set(targetColors);
    geo.attributes.size.array.set(targetSizes);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.size.needsUpdate = true;
}
