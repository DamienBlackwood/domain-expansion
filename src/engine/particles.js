import * as THREE from 'three';
import { COUNT } from '../utils.js';
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
