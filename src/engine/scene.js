import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { STARS } from '../utils.js';
import { state } from '../state.js';

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06070b, 0.0055);

export const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 1200);
camera.position.z = 58;

export const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.setClearColor(0x050508, 1);
document.body.appendChild(renderer.domElement);

export const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, 2));
composer.setSize(innerWidth, innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const dpr = Math.min(devicePixelRatio, 2);
export const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(innerWidth * dpr, innerHeight * dpr),
    1.0,
    0.95,
    0.22
);
composer.addPass(bloomPass);

export const bloomStrengths = {
    neutral: 0.28,
    blue: 0.95,
    red: 1.0,
    purple: 1.18,
    void: 1.05,
    shrine:  1.12,
    chimera: 0.85,
};

const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(STARS * 3);
for (let i = 0; i < STARS; i++) {
    const r = 110 + Math.random() * 190;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    starPos[i * 3 + 2] = r * Math.cos(ph);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

export const starField = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
        size: 0.16,
        color: 0xe8ecff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.42,
    })
);
scene.add(starField);

export function setBackground(hexColor) {
    renderer.setClearColor(hexColor, 1);
}

// single source of truth for the perf-mode pixel ratio cap — renderer.setPixelRatio()
// and composer.setPixelRatio() both internally re-run setSize() against their last-known
// width/height, so this alone keeps renderer + composer + bloomPass in sync, resize or not
export function applyPixelRatio(perfEnabled) {
    const dpr = Math.min(devicePixelRatio, perfEnabled ? 0.95 : 2);
    renderer.setPixelRatio(dpr);
    composer.setPixelRatio(dpr);
    return dpr;
}

export function handleResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    applyPixelRatio(state.perfMode);
}
