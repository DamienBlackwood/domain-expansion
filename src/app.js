import * as THREE from 'three';

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 55;

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const COUNT = 30000;
const TAU = Math.PI * 2;
const geo   = new THREE.BufferGeometry();

const positions       = new Float32Array(COUNT * 3);
const colors          = new Float32Array(COUNT * 3);
const sizes           = new Float32Array(COUNT);
const targetPositions = new Float32Array(COUNT * 3);
const targetColors    = new Float32Array(COUNT * 3);
const targetSizes     = new Float32Array(COUNT);

const phases  = new Float32Array(COUNT);
const phases2 = new Float32Array(COUNT);

geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

const mat = new THREE.ShaderMaterial({
    vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = clamp(size * (320.0 / -mv.z), 1.0, 96.0);
            gl_Position  = projectionMatrix * mv;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        void main() {
            vec2 p = gl_PointCoord - 0.5;
            float d = length(p) * 2.0;

            float core = exp(-d * d * 12.0);
            float glow = exp(-d * d * 2.5);
            float aura = exp(-d * d * 0.6);

            float alpha = core * 0.9 + glow * 0.4 + aura * 0.12;
            alpha *= (1.0 - d * d * 0.6);
            if (alpha < 0.003) discard;

            float luminance = core * 1.1 + glow * 0.45 + aura * 0.15;
            vec3 col = vColor * (0.35 + luminance);
            col += vColor * (core * 0.06);

            gl_FragColor = vec4(col, alpha);
        }
    `,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
});
const particles = new THREE.Points(geo, mat);
particles.frustumCulled = false;
scene.add(particles);

const STARS = 3000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(STARS * 3);
for (let i = 0; i < STARS; i++) {
    const r = 90 + Math.random() * 150, th = Math.random() * 6.28, ph = Math.acos(2*Math.random()-1);
    starPos[i*3] = r*Math.sin(ph)*Math.cos(th);
    starPos[i*3+1] = r*Math.sin(ph)*Math.sin(th);
    starPos[i*3+2] = r*Math.cos(ph);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starField = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 0.12, color: 0xffffff, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, opacity: 0.5,
}));
scene.add(starField);

let techTime = 0;
const VOID_BUILDUP_SECONDS = 7.5;
const SHRINE_BUILDUP_SECONDS = 6;

function initPhases() {
    for (let i = 0; i < COUNT; i++) { phases[i] = Math.random(); phases2[i] = Math.random(); }
}

const voidBg = new Float32Array(COUNT * 3);
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
const streamBasis = streamDirs.map(v => {
    const dir = new THREE.Vector3(v.x, v.y, v.z).normalize();
    const ref = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(ref, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    return {
        dir: { x: dir.x, y: dir.y, z: dir.z },
        right: { x: right.x, y: right.y, z: right.z },
        up: { x: up.x, y: up.y, z: up.z },
    };
});

function animateVoid(t) {
    const build = Math.max(0, Math.min(1, t / VOID_BUILDUP_SECONDS));
    const revealCore = clamp01((build - 0.00) / 0.20);
    const revealRays = clamp01((build - 0.14) / 0.28);
    const revealStreams = clamp01((build - 0.38) / 0.30);
    const revealShell = clamp01((build - 0.65) / 0.35);
    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i], pct = i / COUNT;
        let x, y, z, r, g, b, s;
        const seedA = p * TAU + t * 0.7;
        const seedR = 2.2 + p2 * 5.8;
        const seedX = Math.cos(seedA) * seedR;
        const seedY = -4 + (p2 - 0.5) * 8 + Math.sin(t * 1.2 + p * 9) * 0.8;
        const seedZ = Math.sin(seedA) * seedR;
        const baseSeedR = 0.02;
        const baseSeedG = 0.05;
        const baseSeedB = 0.16;
        const baseSeedS = 0.18;
        let reveal;

        if (pct < 0.09) {
            const lane = i % 6;
            const laneCount = Math.max(1, Math.floor((COUNT * 0.09) / 6));
            const u = Math.floor(i / 6) / laneCount;
            const spin = lane % 2 === 0 ? 1 : -1;
            const a = u * TAU + t * (0.2 + lane * 0.035) * spin;
            const rad = 10.5 + lane * 2.15 + Math.sin(t * 1.4 + u * TAU * 2 + lane) * 0.85;
            x = Math.cos(a) * rad;
            y = Math.sin(a) * rad * (0.76 + lane * 0.02);
            z = Math.sin(a * 2.2 + t * 0.9 + lane) * 1.8;
            r = 1.35 + lane * 0.09;
            g = 1.7 + lane * 0.08;
            b = 2.05 + lane * 0.08;
            s = 2.1 - lane * 0.15;
            reveal = 0.18 + revealCore * 0.82;
        } else if (pct < 0.22) {
            const lane = i % 10;
            const laneCount = Math.max(1, Math.floor((COUNT * 0.13) / 10));
            const u = Math.floor((i - Math.floor(COUNT * 0.09)) / 10) / laneCount;
            const a = u * TAU + lane * 0.17 + t * (0.07 + lane * 0.006);
            const rad = 23 + lane * 1.35 + Math.sin(u * TAU * 6 + t * 0.8 + lane) * 1.2;
            x = Math.cos(a) * rad + Math.sin(u * TAU * 9 + lane) * 0.9;
            y = Math.sin(a) * rad * 0.72 + Math.cos(u * TAU * 7 + lane) * 0.7;
            z = (lane - 4.5) * 0.55 + Math.sin(t * 0.5 + u * TAU * 5) * 1.5;
            r = 0.8;
            g = 1.15;
            b = 1.7;
            s = 1.15;
            reveal = 0.04 + revealRays * 0.96;
        } else if (pct < 0.40) {
            const rayCount = 40;
            const ray = i % rayCount;
            const rayLenCount = Math.max(1, Math.floor((COUNT * 0.18) / rayCount));
            const u = Math.floor((i - Math.floor(COUNT * 0.22)) / rayCount) / rayLenCount;
            const rayA = (ray / rayCount) * TAU;
            const dist = 19 + u * 122 + Math.sin(t * 1.7 + ray * 0.45) * 1.6;
            const jitter = Math.sin(u * TAU * 4 + ray * 0.5 + t * 2) * 0.7;
            x = Math.cos(rayA) * (dist + jitter);
            y = Math.sin(rayA) * (dist + jitter) * 0.66;
            z = (u - 0.5) * 24 + Math.cos(t * 1.2 + ray * 0.6) * 1.9;
            const bright = 1 - u;
            r = 1.05 + bright * 0.9;
            g = 1.3 + bright * 0.9;
            b = 1.7 + bright * 1.0;
            s = 0.95 + bright * 0.75;
            reveal = revealRays;
        } else if (pct < 0.57) {
            const clusters = 8;
            const splashAngles = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5, Math.PI * 0.22, Math.PI * 0.78, Math.PI * 1.22, Math.PI * 1.78];
            const cluster = i % clusters;
            const segCount = Math.max(1, Math.floor((COUNT * 0.17) / clusters));
            const u = Math.floor((i - Math.floor(COUNT * 0.40)) / clusters) / segCount;
            const baseA = splashAngles[cluster];
            const jitterA = Math.sin(u * 16 + t * 0.9 + cluster * 0.7) * 0.15;
            const a = baseA + jitterA;
            const spray = 30 + u * 46 + Math.sin(u * 26 + p2 * 8) * 2.8;
            const width = (1 - u) * (2.6 + (cluster % 2 === 0 ? 1.8 : 0.8));
            x = Math.cos(a) * spray + Math.sin(a + Math.PI * 0.5) * width * Math.sin(u * 20 + t * 1.5);
            y = Math.sin(a) * spray * 0.62 + Math.cos(a) * width * Math.cos(u * 19 + t * 1.5);
            z = (cluster % 2 === 0 ? 5.8 : -5.8) * (1 - u) + Math.sin(u * 15 + t + cluster) * 1.4;
            r = 1.6;
            g = 1.9;
            b = 2.2;
            s = 0.75 + (1 - u) * 0.95;
            reveal = revealRays * 0.92;
        } else if (pct < 0.74) {
            const streamCount = 24;
            const stream = i % streamCount;
            const segCount = Math.max(1, Math.floor((COUNT * 0.17) / streamCount));
            const flow = (Math.floor((i - Math.floor(COUNT * 0.57)) / streamCount) / segCount + p + t * (0.2 + (stream % 5) * 0.018)) % 1;
            const a = (stream / streamCount) * TAU + Math.sin(t * 0.22 + stream) * 0.03;
            const rad = 27 + (stream % 3) * 3.2;
            const swirl = Math.sin(flow * TAU * 3 + t * 2.2 + stream) * 1.15;
            x = Math.cos(a) * rad + Math.cos(a + Math.PI * 0.5) * swirl;
            y = 52 - flow * 104;
            z = Math.sin(a) * rad * 0.82 + Math.sin(flow * TAU * 2 + stream) * 1.5;
            r = 1.0;
            g = 1.2;
            b = 1.55;
            s = 0.5 + (1 - flow) * 0.42;
            reveal = revealStreams;
        } else {
            const bx = voidBg[i*3], by = voidBg[i*3+1], bz = voidBg[i*3+2];
            x = bx + Math.sin(t * 0.2 + p * 6) * 2.1;
            y = by + Math.cos(t * 0.17 + p2 * 7) * 2.3;
            z = bz + Math.sin(t * 0.23 + p * 8) * 2.1;
            r = 0.1;
            g = 0.34;
            b = 1.0;
            s = 0.42;
            reveal = revealShell;
        }

        const eased = reveal * reveal * (3 - 2 * reveal);
        targetPositions[i*3] = seedX + (x - seedX) * eased;
        targetPositions[i*3+1] = seedY + (y - seedY) * eased;
        targetPositions[i*3+2] = seedZ + (z - seedZ) * eased;
        targetColors[i*3] = baseSeedR + (r - baseSeedR) * eased;
        targetColors[i*3+1] = baseSeedG + (g - baseSeedG) * eased;
        targetColors[i*3+2] = baseSeedB + (b - baseSeedB) * eased;
        targetSizes[i] = baseSeedS + (s - baseSeedS) * eased;
    }
}

function getDissolveParticle(i, t) {
    const p = phases[i];
    const p2 = phases2[i];
    const shell = 62 + p * 92;
    const a = p * TAU + t * (0.08 + p2 * 0.12);
    const wave = Math.sin(t * 0.7 + p * 9) * 2.6;
    return {
        x: Math.cos(a) * shell + wave,
        y: (p2 - 0.5) * 84 + Math.cos(t * 0.5 + p2 * 11) * 6,
        z: Math.sin(a) * shell + Math.sin(t * 0.8 + p2 * 7) * 2.2,
        r: 0.05,
        g: 0.11,
        b: 0.24,
        s: 0.16 + (1 - p2) * 0.22,
    };
}

function animateNeutral(t) {
    for (let i = 0; i < COUNT; i++) {
        const pct = i / COUNT;
        let p;
        if (pct < 0.06) {
            const u = phases[i];
            const v = phases2[i];
            const th = u * TAU + t * 0.3;
            const ph = Math.acos(2 * v - 1);
            const rad = 14 + u * 16 + Math.sin(t * 0.8 + u * 8) * 1.2;
            p = {
                x: rad * Math.sin(ph) * Math.cos(th),
                y: rad * Math.sin(ph) * Math.sin(th),
                z: rad * Math.cos(ph),
                r: 0.09,
                g: 0.14,
                b: 0.3,
                s: 0.32,
            };
        } else {
            p = getDissolveParticle(i, t);
        }
        targetPositions[i*3] = p.x; targetPositions[i*3+1] = p.y; targetPositions[i*3+2] = p.z;
        targetColors[i*3] = p.r; targetColors[i*3+1] = p.g; targetColors[i*3+2] = p.b;
        targetSizes[i] = p.s;
    }
}

function animateRed(t) {
    const form = Math.min(1, t / 0.72);
    const blend = form * form * (3 - 2 * form);
    const pulse = 1 + Math.sin(t * 2.2) * 0.065;
    const baseRadius = (2.1 + form * 11.6) * pulse;
    const coreCut = 0.09;

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i];
        const p2 = phases2[i];
        const pct = i / COUNT;

        const circleA = p * TAU;
        const circleR = Math.sqrt(p2) * baseRadius;
        const circleX = Math.cos(circleA) * circleR;
        const circleY = Math.sin(circleA) * circleR;
        const circleZ = 0;

        let x, y, z, r, g, b, s;

        if (pct < coreCut) {
            const u = pct / coreCut;
            const jitterA =
                Math.sin(t * 3.5 + p * 31) * 0.26 +
                Math.sin(t * 2.2 - p2 * 27) * 0.18;
            const a = p * TAU + Math.sin(t * 1.1 + p2 * 12) * 0.18 + jitterA;
            const rad = (1.35 + Math.pow(p2, 0.85) * 5.9 + Math.sin(t * 1.7 + p * 19) * 0.55) * pulse;
            x = Math.cos(a) * rad;
            y = Math.sin(a) * rad;
            z = Math.sin(a * 2.5 + t * 2.1 + p * 7) * 0.52;
            const heat = 1 - u * 0.7;
            r = 0.58 + heat * 0.22;
            g = 0.008 + heat * 0.012;
            b = 0.003 + heat * 0.005;
            s = 0.34 + heat * 0.46;
        } else if (pct < 0.82) {
            const u = (pct - coreCut) / (0.82 - coreCut);
            const radial = (2.7 + Math.pow(u, 0.56) * 36) * pulse;

            const roughA = Math.sin(t * 3.2 + p * 18 + p2 * 8) * (1 - u) * 0.32;
            const roughR = (
                Math.sin(t * 2.6 + p * 11) * 1.15 +
                Math.sin(t * 1.9 - p2 * 17) * 0.85 +
                Math.cos(t * 1.4 + p * 23) * 0.5
            ) * (1 - u);
            const cross = (p2 - 0.5) * (1 - u) * 3.1;
            const twist = p * TAU + radial * (0.22 + 0.14 * form) + roughA;

            x = Math.cos(twist) * (radial + roughR) + Math.cos(twist + Math.PI * 0.5) * cross;
            y = Math.sin(twist) * (radial + roughR) + Math.sin(twist + Math.PI * 0.5) * cross;
            z = (p2 - 0.5) * (1 - u) * 1.95 + Math.sin(twist * 2.0 + t * 1.6 + p * 9) * 0.72;

            const heat = 1 - u * 0.68;
            r = 0.68 + heat * 0.5;
            g = 0.008 + heat * 0.03;
            b = 0.003 + heat * 0.01;
            s = 0.38 + heat * 0.78;
        } else if (pct < 0.94) {
            const u = (pct - 0.82) / 0.12;
            const a = p * TAU + u * 6.1 + Math.sin(t * 0.95 + p * 8) * 0.24;
            const rad = 22 + p2 * 18 + Math.sin(t * 1.1 + p * 9) * 1.5;
            x = Math.cos(a) * rad;
            y = Math.sin(a) * rad;
            z = Math.sin(a * 1.7 + t * 1.2) * 0.92;
            const fade = (1 - u) * (1 - p2);
            r = 0.32 * fade;
            g = 0.01 * fade;
            b = 0.004 * fade;
            s = 0.22 + fade * 0.45;
        } else {
            const d = getDissolveParticle(i, t);
            x = d.x;
            y = d.y;
            z = d.z;
            r = 0.08;
            g = 0.0;
            b = 0.0;
            s = d.s * 0.45;
        }

        x = circleX + (x - circleX) * blend;
        y = circleY + (y - circleY) * blend;
        z = circleZ + (z - circleZ) * blend;

        targetPositions[i * 3] = x;
        targetPositions[i * 3 + 1] = y;
        targetPositions[i * 3 + 2] = z;
        targetColors[i * 3] = r;
        targetColors[i * 3 + 1] = g;
        targetColors[i * 3 + 2] = b;
        targetSizes[i] = s;
    }
}

function animateBlue(t) {
    if (t < 0.55) {
        const intro = t / 0.55;
        const pulse = 1 + Math.sin(t * 6.0) * 0.04;
        const radius = (11 + intro * 1.5) * pulse;
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < COUNT; i++) {
            const u = (i + 0.5) / COUNT;
            const a = i * golden;
            const r = Math.sqrt(u) * radius;
            const z = 0;
            targetPositions[i * 3] = Math.cos(a) * r;
            targetPositions[i * 3 + 1] = Math.sin(a) * r;
            targetPositions[i * 3 + 2] = z;
            targetColors[i * 3] = 0.0;
            targetColors[i * 3 + 1] = 0.22;
            targetColors[i * 3 + 2] = 1.0;
            targetSizes[i] = 0.5 + (1 - Math.sqrt(u)) * 0.9;
        }
        return;
    }

    const breathe = 1 + Math.sin(t * 1.4) * 0.04;
    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i], pct = i / COUNT;
        let x, y, z, r, g, b, s;

        if (pct < 0.05) {
            const th = p * TAU - t * 4.0;
            const ph = Math.acos(2 * p2 - 1);
            const rad = p * 2.0 * breathe;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th);
            z = rad * Math.cos(ph);
            r = 0.0; g = 0.3; b = 1.45;
            s = 3.8 + Math.sin(t * 6 + p * 10) * 0.5;
        } else if (pct < 0.13) {
            const th = p * TAU - t * 3.0;
            const ph = Math.acos(2 * p2 - 1);
            const rad = (2 + p * 5.5) * breathe;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th);
            z = rad * Math.cos(ph);
            const u = (pct - 0.05) / 0.08;
            r = 0.0; g = 0.12 - u * 0.04; b = 1.0 - u * 0.25;
            s = 2.2 - u * 0.6;
        } else if (pct < 0.26) {
            const u = (pct - 0.13) / 0.13;
            const th = p * TAU - t * 2.2;
            const ph = Math.acos(2 * p2 - 1);
            const rad = (8 + u * 16) * breathe;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th);
            z = rad * Math.cos(ph);
            const depth = 1 - u;
            r = 0.0; g = 0.04 + depth * 0.08; b = 0.5 + depth * 0.4;
            s = 1.2 - u * 0.3;
        } else if (pct < 0.44) {
            const lane = i % streamBasis.length;
            const basis = streamBasis[lane];
            const flow = (p + t * (0.22 + lane * 0.01)) % 1;
            const dist = (1 - flow) * 90 + 6;
            const spin = -t * 1.8 + lane * 0.4 + p2 * TAU;
            const swirlR = flow * (4.5 + (lane % 4) * 1.2) + 0.3;
            const cs = Math.cos(spin), sn = Math.sin(spin);
            x = basis.dir.x * dist + (basis.right.x * cs + basis.up.x * sn) * swirlR;
            y = basis.dir.y * dist + (basis.right.y * cs + basis.up.y * sn) * swirlR;
            z = basis.dir.z * dist + (basis.right.z * cs + basis.up.z * sn) * swirlR;
            const pull = flow;
            r = 0.0; g = 0.02 + pull * 0.1; b = 0.2 + pull * 0.7;
            s = 0.3 + pull * 0.8;
        } else if (pct < 0.58) {
            const arm = i % 6;
            const segCount = Math.max(1, Math.floor((COUNT * 0.14) / 6));
            const u = Math.floor((i - Math.floor(COUNT * 0.44)) / 6) / segCount;
            const spiral = (arm / 6) * TAU - t * 0.6 + u * 6;
            const dist = (1 - u) * 35 + 6;
            const width = u * 2 + 0.3;
            x = Math.cos(spiral) * dist;
            z = Math.sin(spiral) * dist;
            y = Math.sin(u * 14 + arm + t * 1.8) * width;
            const bright = u;
            r = 0.0; g = 0.02 + bright * 0.08; b = 0.3 + bright * 0.5;
            s = 0.4 + bright * 0.5;
        } else if (pct < 0.75) {
            const th = p * TAU - t * 0.08;
            const ph = Math.acos(2 * p2 - 1);
            const rad = 28 + Math.pow(p, 0.5) * 65;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.cos(ph) * 0.5 + Math.sin(t * 0.3 + p * 5) * 2;
            z = rad * Math.sin(ph) * Math.sin(th);
            r = 0.0; g = 0.01; b = 0.08 + p * 0.15;
            s = 0.22;
        } else {
            const d = getDissolveParticle(i, t);
            x = d.x; y = d.y; z = d.z;
            r = 0.0; g = 0.005; b = 0.04 + d.b * 0.2;
            s = d.s * 0.5;
        }
        targetPositions[i * 3] = x; targetPositions[i * 3 + 1] = y; targetPositions[i * 3 + 2] = z;
        targetColors[i * 3] = r; targetColors[i * 3 + 1] = g; targetColors[i * 3 + 2] = b;
        targetSizes[i] = s;
    }
}

function animatePurple(t) {
    const intensity = 1 + Math.sin(t * 3) * 0.2;
    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i], pct = i / COUNT;
        let x, y, z, r, g, b, s;

        if (pct < 0.08) {
            const th = p * TAU + t * 2.0;
            const ph = Math.acos(2 * p2 - 1);
            const rad = p * 3.5 * intensity;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th);
            z = rad * Math.cos(ph);
            r = 0.8 + Math.sin(t * 5 + p * 8) * 0.2; g = 0.1; b = 1.2 + Math.sin(t * 5 + p * 8) * 0.3;
            s = 3.5 + Math.sin(t * 4 + p * 6) * 0.5;
        } else if (pct < 0.18) {
            const th = p * TAU + t * 1.5;
            const ph = Math.acos(2 * p2 - 1);
            const rad = (4 + p * 8) * intensity;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th);
            z = rad * Math.cos(ph);
            const u = (pct - 0.08) / 0.10;
            r = 0.6 - u * 0.2; g = 0.02; b = 0.9 - u * 0.2;
            s = 2.0 - u * 0.5;
        } else if (pct < 0.34) {
            const u = (pct - 0.18) / 0.16;
            const angle = p * TAU + t * 1.8 + u * 12;
            const dist = (1 - u) * 30 + 4;
            const thick = (1 - u) * 4 + 0.5;
            x = -dist * 0.8 + Math.cos(angle) * thick;
            y = Math.sin(angle) * thick;
            z = Math.sin(angle * 0.7) * thick * 0.5;
            r = 0.02 + u * 0.08; g = 0.02; b = 0.5 + u * 0.4;
            s = 1.2 - u * 0.3;
        } else if (pct < 0.50) {
            const u = (pct - 0.34) / 0.16;
            const angle = p * TAU - t * 1.8 - u * 12;
            const dist = (1 - u) * 30 + 4;
            const thick = (1 - u) * 4 + 0.5;
            x = dist * 0.8 - Math.cos(angle) * thick;
            y = Math.sin(angle) * thick;
            z = Math.sin(angle * 0.7) * thick * 0.5;
            r = 0.55 - u * 0.15; g = 0.0; b = 0.04 + u * 0.06;
            s = 1.2 - u * 0.3;
        } else if (pct < 0.66) {
            const lane = i % streamBasis.length;
            const basis = streamBasis[lane];
            const flow = (p + t * (0.3 + lane * 0.01)) % 1;
            const dist = 8 + flow * 60;
            const spin = t * 1.5 + p2 * TAU + lane * 0.5;
            const swirlR = (1 - flow) * 3;
            const cs = Math.cos(spin), sn = Math.sin(spin);
            x = basis.dir.x * dist + (basis.right.x * cs + basis.up.x * sn) * swirlR;
            y = basis.dir.y * dist + (basis.right.y * cs + basis.up.y * sn) * swirlR;
            z = basis.dir.z * dist + (basis.right.z * cs + basis.up.z * sn) * swirlR;
            const spark = 1 - flow;
            r = 0.3 * spark; g = 0.02 * spark; b = 0.4 * spark;
            s = 0.4 + spark * 0.6;
        } else if (pct < 0.80) {
            const th = p * TAU + t * 0.15;
            const ph = Math.acos(2 * p2 - 1);
            const rad = 22 + Math.pow(p, 0.5) * 55;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.cos(ph);
            z = rad * Math.sin(ph) * Math.sin(th);
            const side = x > 0 ? 1 : 0;
            r = side ? 0.12 : 0.02; g = 0.0; b = side ? 0.02 : 0.12;
            s = 0.25;
        } else {
            const burst = ((t * 0.4 + p) % 1);
            const th = p2 * TAU;
            const ph = Math.acos(2 * p - 1);
            const rad = burst * 55;
            x = rad * Math.sin(ph) * Math.cos(th);
            y = rad * Math.sin(ph) * Math.sin(th);
            z = rad * Math.cos(ph);
            const fade = 1 - burst;
            r = 0.35 * fade; g = 0.02 * fade; b = 0.4 * fade;
            s = 0.3 * fade + 0.1;
        }
        targetPositions[i*3]=x; targetPositions[i*3+1]=y; targetPositions[i*3+2]=z;
        targetColors[i*3]=r; targetColors[i*3+1]=g; targetColors[i*3+2]=b;
        targetSizes[i]=s;
    }
}

function animateShrine(t) {
    const build = Math.max(0, Math.min(1, t / SHRINE_BUILDUP_SECONDS));
    const revealWater  = clamp01((build - 0.00) / 0.18);
    const revealBase   = clamp01((build - 0.12) / 0.20);
    const revealBody   = clamp01((build - 0.26) / 0.22);
    const revealTeeth  = clamp01((build - 0.38) / 0.18);
    const revealRoof   = clamp01((build - 0.48) / 0.20);
    const revealHorns  = clamp01((build - 0.58) / 0.18);
    const revealSkulls = clamp01((build - 0.66) / 0.16);
    const revealSky    = clamp01((build - 0.72) / 0.28);
    const revealAsh    = clamp01((build - 0.78) / 0.22);
    const sm = x => x * x * (3 - 2 * x);
    const eW = sm(revealWater), eB = sm(revealBase), eBd = sm(revealBody);
    const eT = sm(revealTeeth), eR = sm(revealRoof), eH = sm(revealHorns);
    const eSk = sm(revealSkulls), eSky = sm(revealSky), eA = sm(revealAsh);
    const pulse = 1 + Math.sin(t * 1.8) * 0.04;
    const breathe = Math.sin(t * 0.9) * 0.6;
    const baseR = 0.06, baseG = 0.005, baseB = 0.0, baseS = 0.15;

    for (let i = 0; i < COUNT; i++) {
        const p = phases[i], p2 = phases2[i], pct = i / COUNT;
        let x, y, z, r, g, b, s;
        let sx = 0, sy = -24, sz = 0, reveal = 0;

        if (pct < 0.15) {
            const a = p * TAU * 3.2 + t * 0.12;
            const rad = 8 + Math.sqrt(p2) * 52;
            const ripple = Math.sin(rad * 0.35 + t * 1.8 + p * 12) * 0.4;
            x = Math.cos(a) * rad;
            z = Math.sin(a) * rad * 0.55;
            y = -24 + ripple + Math.sin(a * 2.5 + t * 0.7) * 0.15;
            const refGlow = Math.max(0, Math.sin(a * 1.5 + t * 0.6) * 0.3);
            r = 0.04 + refGlow * 0.18;
            g = 0.008 + refGlow * 0.01;
            b = 0.005;
            s = 0.35 + refGlow * 0.4;
            sx = Math.cos(a) * 4;
            sy = -24;
            sz = Math.sin(a) * 3;
            reveal = eW;
        } else if (pct < 0.30) {
            const u = (pct - 0.15) / 0.15;
            const side = (p - 0.5) * 2;
            const depth = (p2 - 0.5) * 2;
            const hw = 12 + (1 - u) * 3;
            const hd = 7 + (1 - u) * 2;
            x = side * hw + Math.sin(t * 0.3 + p * 8) * 0.08;
            z = depth * hd;
            y = -24 + u * 12;
            const edge = Math.max(Math.abs(side), Math.abs(depth));
            r = 0.10 + edge * 0.04;
            g = 0.03 + edge * 0.01;
            b = 0.015;
            s = 0.7 + edge * 0.3;
            sx = side * 3;
            sy = -24;
            sz = depth * 2;
            reveal = eB;
        } else if (pct < 0.44) {
            const u = (pct - 0.30) / 0.14;
            const wallAngle = p * TAU;
            const wallR = 10 - u * 2.5;
            const ht = u * 28;
            x = Math.cos(wallAngle) * wallR;
            z = Math.sin(wallAngle) * wallR * 0.65;
            y = -12 + ht;

            const frontFace = Math.max(0, -Math.cos(wallAngle));
            const sideFace = Math.abs(Math.sin(wallAngle));
            const isMouth = (frontFace > 0.6 || sideFace > 0.85) && u > 0.1 && u < 0.7;

            if (isMouth) {
                const mouthOpen = Math.sin(u * Math.PI) * 4.5;
                const inward = 2.5 + p2 * 3.5;
                x += Math.cos(wallAngle) * inward;
                z += Math.sin(wallAngle) * inward * 0.65;
                y += (p2 - 0.5) * mouthOpen;
                const throat = (1 - p2) * 0.8;
                r = 0.65 + throat * 0.9;
                g = 0.08 + throat * 0.15;
                b = 0.02 + throat * 0.04;
                s = (0.6 + throat * 1.8) * pulse;
            } else {
                r = 0.12 + u * 0.06;
                g = 0.03;
                b = 0.015;
                s = 0.65;
            }
            sx = Math.cos(wallAngle) * 3;
            sy = -12;
            sz = Math.sin(wallAngle) * 2;
            reveal = eBd;
        } else if (pct < 0.54) {
            const u = (pct - 0.44) / 0.10;
            const mouthIdx = Math.floor(p2 * 3);
            const mouthAngles = [Math.PI, Math.PI * 0.5, Math.PI * 1.5];
            const ma = mouthAngles[mouthIdx];
            const jawSide = p < 0.5 ? -1 : 1;
            const along = (u - 0.5) * 2;
            const toothR = 7 + Math.abs(along) * 1.5;
            const fangLen = (1 - Math.abs(along)) * 3.2 + p2 * 1.8;

            x = Math.cos(ma) * toothR + along * Math.sin(ma) * 5;
            z = Math.sin(ma) * toothR * 0.65 + along * (-Math.cos(ma)) * 3.2;
            const baseY = mouthIdx === 0 ? 4 : 6;
            y = baseY + jawSide * (2.5 + fangLen) + Math.sin(t * 2.5 + p * 7) * 0.15;

            r = 0.85 + p2 * 0.15;
            g = 0.78 + p2 * 0.12;
            b = 0.55 + p2 * 0.1;
            s = (0.45 + fangLen * 0.22) * pulse;
            sx = Math.cos(ma) * 3;
            sy = baseY;
            sz = Math.sin(ma) * 2;
            reveal = eT;
        } else if (pct < 0.66) {
            const u = (pct - 0.54) / 0.12;
            const w = (p - 0.5) * 2;
            const tier = Math.floor(p2 * 2);
            const span = 16 - tier * 3 - Math.abs(w) * 2;
            x = w * span;
            const peak = Math.pow(Math.max(0, 1 - Math.abs(w)), 0.5) * (6 + tier * 3);
            const edgeCurl = Math.pow(Math.max(0, Math.abs(w) - 0.7) / 0.3, 1.5) * (8 + tier * 2);
            y = 16 + tier * 4 + peak + edgeCurl + breathe * 0.3;
            z = (tier === 0 ? -1 : 1) * (3 + Math.abs(w) * 6) + Math.sin(w * 6 + t * 0.6) * 0.3;
            r = 0.28 + tier * 0.08;
            g = 0.02 + tier * 0.005;
            b = 0.01;
            s = 0.72 + tier * 0.15;
            sx = w * 4;
            sy = 14;
            sz = z * 0.25;
            reveal = eR;
        } else if (pct < 0.74) {
            const u = (pct - 0.66) / 0.08;
            const hornIdx = Math.floor(p2 * 6);
            const hornAngles = [0.35, -0.35, 0.85, -0.85, 1.35, -1.35];
            const ha = hornAngles[hornIdx] * Math.PI;
            const baseX = Math.cos(ha) * 14;
            const baseZ = Math.sin(ha) * 9;
            const curve = u * u;
            const outward = 1 + curve * 8;
            const upward = u * 18 + curve * 6;
            x = baseX + Math.cos(ha) * outward + Math.sin(t * 0.7 + hornIdx) * 0.2;
            z = baseZ + Math.sin(ha) * outward * 0.6;
            y = 22 + upward;
            const tip = u * u;
            r = 0.82 - tip * 0.4;
            g = 0.72 - tip * 0.52;
            b = 0.48 - tip * 0.38;
            const redTip = Math.max(0, u - 0.7) / 0.3;
            r += redTip * 0.5;
            g -= redTip * 0.2;
            s = 0.55 + (1 - u) * 0.35;
            sx = baseX * 0.5;
            sy = 20;
            sz = baseZ * 0.3;
            reveal = eH;
        } else if (pct < 0.80) {
            const u = (pct - 0.74) / 0.06;
            const skullIdx = Math.floor(p2 * 4);
            const skullAngles = [0.6, -0.6, 1.2, -1.2];
            const sa = skullAngles[skullIdx] * Math.PI;
            const cx = Math.cos(sa) * 13;
            const cz = Math.sin(sa) * 8;
            const cy = 18 + skullIdx * 2;
            const off = u * TAU;
            const skullR = 1.5 + Math.sin(t * 1.2 + skullIdx * 2) * 0.2;
            x = cx + Math.cos(off) * skullR * (0.8 + Math.sin(off * 2) * 0.3);
            z = cz + Math.sin(off) * skullR * 0.7;
            y = cy + Math.cos(off * 1.3) * skullR * 0.9 - 2;
            const swing = Math.sin(t * 0.5 + skullIdx * 1.5) * 1.2;
            x += swing;
            r = 0.78;
            g = 0.68;
            b = 0.45;
            s = 0.5 + Math.sin(off * 3) * 0.15;
            sx = cx;
            sy = cy;
            sz = cz;
            reveal = eSk;
        } else if (pct < 0.90) {
            const u = (pct - 0.80) / 0.10;
            const a = p * TAU * 2 + t * (0.08 + p2 * 0.06);
            const rad = 20 + u * 70;
            const elev = 15 + u * 40 + Math.sin(t * 0.3 + p * 5) * 3;
            x = Math.cos(a) * rad;
            z = Math.sin(a) * rad * 0.6;
            y = elev + Math.sin(a * 1.5 + t * 0.5) * 2;
            const depth = u;
            r = 0.22 + (1 - depth) * 0.25;
            g = 0.015 + (1 - depth) * 0.02;
            b = 0.005;
            s = 0.3 + (1 - depth) * 0.35;
            sx = Math.cos(a) * 8;
            sy = 10;
            sz = Math.sin(a) * 5;
            reveal = eSky;
        } else {
            const rad = 5 + p * 80;
            const a = p2 * TAU + t * 0.15 + p * 2;
            const rising = p < 0.5;
            x = Math.cos(a) * rad + Math.sin(t * 0.4 + p2 * 8) * 1.5;
            y = rising
                ? -20 + (p * 2) * 65 + Math.sin(t * 0.8 + p2 * 6) * 2
                : 30 - ((p - 0.5) * 2) * 55 + Math.sin(t * 0.6 + p * 4) * 1.5;
            z = Math.sin(a) * rad * 0.5;
            const ember = rising ? 0.3 + (1 - p * 2) * 0.4 : 0;
            r = 0.12 + ember * 0.6;
            g = 0.015 + ember * 0.06;
            b = 0.005 + ember * 0.02;
            s = 0.18 + ember * 0.35;
            sx = x * 0.15;
            sy = rising ? -10 : 20;
            sz = z * 0.15;
            reveal = eA;
        }

        targetPositions[i*3]   = sx + (x - sx) * reveal;
        targetPositions[i*3+1] = sy + (y - sy) * reveal;
        targetPositions[i*3+2] = sz + (z - sz) * reveal;
        targetColors[i*3]   = baseR + (r - baseR) * reveal;
        targetColors[i*3+1] = baseG + (g - baseG) * reveal;
        targetColors[i*3+2] = baseB + (b - baseB) * reveal;
        targetSizes[i] = baseS + (s - baseS) * reveal;
    }
}

function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

function getReleaseColor(tech, alpha) {
    if (tech === 'red') {
        const heat = alpha * alpha;
        return { r: 1.05 + heat * 1.15, g: 0.02 + heat * 0.52, b: 0.01 + heat * 0.44 };
    }
    if (tech === 'blue') return { r: 0.02, g: 0.5 + alpha * 0.35, b: 1.1 + alpha * 1.2 };
    return { r: 0.5 + alpha * 0.8, g: 0.06 + alpha * 0.07, b: 0.9 + alpha * 1.0 };
}

function triggerRelease(tech, dx, dy) {
    const v = new THREE.Vector3(dx * 2.2, -dy * 2.1, -0.55);
    if (v.lengthSq() < 1e-4) v.set(0.0, 0.0, -1.0);
    v.normalize();
    releaseFx.active = true;
    releaseFx.tech = tech;
    releaseFx.age = 0;
    releaseFx.dir.copy(v);
    releaseFx.burst = 1.0;
    shakeDecay = Math.max(shakeDecay, 1.25);
}

function applyReleaseOverlay(dt) {
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
        let along;
        let radius;
        let spin;
        let glow;

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

        targetPositions[i*3] = dir.x * along + radialX;
        targetPositions[i*3+1] = dir.y * along + radialY;
        targetPositions[i*3+2] = dir.z * along + radialZ;

        const tint = getReleaseColor(releaseFx.tech, glow);
        targetColors[i*3] = tint.r;
        targetColors[i*3+1] = tint.g;
        targetColors[i*3+2] = tint.b;
        targetSizes[i] = 0.8 + glow * (2.4 - p * 1.1);
    }
}

const shrineOverlay = document.getElementById('shrine-overlay');
const sukunaGuide   = document.getElementById('sukuna-guide');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);

const audioBank = {};
function loadAudio(name, url) {
    audioBank[name] = {
        buffer: null,
        source: null,
        gain: null,
        lastPlayAt: 0,
        startedAtCtx: 0,
        offsetAtStart: 0,
        pauseOffset: 0,
        pausedAt: 0,
        isLoop: false,
    };
    fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
        .then(buf => audioCtx.decodeAudioData(buf))
        .then(dec => { audioBank[name].buffer = dec; })
        .catch(e => console.warn(`${name} audio:`, e));
}
async function loadAudioFirst(name, urls) {
    audioBank[name] = {
        buffer: null,
        source: null,
        gain: null,
        lastPlayAt: 0,
        startedAtCtx: 0,
        offsetAtStart: 0,
        pauseOffset: 0,
        pausedAt: 0,
        isLoop: false,
    };
    for (const url of urls) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const buf = await res.arrayBuffer();
            const dec = await audioCtx.decodeAudioData(buf);
            audioBank[name].buffer = dec;
            return;
        } catch (_) {}
    }
    console.warn(`${name} audio: no usable source`, urls);
}
function playAudio(name, opts = {}) {
    const { loop = false, gain = 0.7, fadeInMs = 220, cooldownMs = 0, resumeWindowMs = 0 } = opts;
    const b = audioBank[name]; if (!b?.buffer || b.source) return;
    const nowMs = performance.now();
    let startOffset = 0;
    if (b.pauseOffset > 0 && resumeWindowMs > 0 && nowMs - b.pausedAt <= resumeWindowMs) {
        startOffset = b.pauseOffset;
    } else {
        b.pauseOffset = 0;
        b.pausedAt = 0;
    }
    if (cooldownMs > 0 && startOffset === 0 && nowMs - b.lastPlayAt < cooldownMs) return;
    b.lastPlayAt = nowMs;

    audioCtx.resume().then(() => {
        const bufferDuration = Math.max(0.001, b.buffer.duration || 0.001);
        const safeOffset = loop
            ? (startOffset % bufferDuration)
            : Math.max(0, Math.min(bufferDuration - 0.001, startOffset));
        b.gain = audioCtx.createGain();
        b.gain.gain.setValueAtTime(0, audioCtx.currentTime);
        b.gain.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + (fadeInMs / 1000));
        b.gain.connect(masterGain);
        const src = audioCtx.createBufferSource();
        src.buffer = b.buffer;
        src.loop = loop;
        src.connect(b.gain);
        src.onended = () => {
            if (b.source === src) {
                src.disconnect();
                b.source = null;
                if (b.gain) {
                    b.gain.disconnect();
                    b.gain = null;
                }
                b.pauseOffset = 0;
                b.pausedAt = 0;
            }
        };
        b.source = src;
        b.isLoop = loop;
        b.offsetAtStart = safeOffset;
        b.startedAtCtx = audioCtx.currentTime;
        src.start(0, safeOffset);
    });
}
function stopAudio(name, opts = {}) {
    const { immediate = false, pause = false } = opts;
    const b = audioBank[name]; if (!b?.source) return;
    const nowMs = performance.now();
    const elapsed = Math.max(0, audioCtx.currentTime - b.startedAtCtx);
    const rawOffset = b.offsetAtStart + elapsed;
    const duration = Math.max(0.001, b.buffer?.duration || 0.001);
    if (pause) {
        b.pauseOffset = b.isLoop
            ? (rawOffset % duration)
            : Math.max(0, Math.min(duration - 0.001, rawOffset));
        b.pausedAt = nowMs;
    } else {
        b.pauseOffset = 0;
        b.pausedAt = 0;
    }
    const src = b.source;
    const gn = b.gain;
    src.onended = null;
    if (immediate) {
        try { src.stop(); } catch(_) {}
        src.disconnect();
        if (gn) gn.disconnect();
        b.source = null;
        b.gain = null;
        return;
    }
    gn.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.12);
    setTimeout(() => { try{src.stop()}catch(_){} src.disconnect(); if (gn) gn.disconnect(); }, 160);
    b.source = null; b.gain = null;
}
loadAudioFirst('void', [
    './sfx/gojos-domain.opus',
    './References/sfx/' + encodeURIComponent('Gojo Domain Expansion sound effect [MQQi5EaMzbs].opus'),
]);
loadAudioFirst('shrine', [
    './sfx/sukunas-domain.opus',
]);

let currentTech = 'neutral';
let lerpRate    = 0.1;
let shakeDecay  = 0;
let shakeTime   = 0;
let glowColor   = '#00ffff';
let perfMode = false;
let handDrawTick = 0;
let animFrameTick = 0;
let simAccumDt = 0;

const gestureKeys = ['red', 'blue', 'purple', 'void', 'shrine'];
const gestureConfig = {
    red:    { enter: 0.68, hold: 0.36, rise: 0.26, fall: 0.14, cooldown: 260 },
    blue:   { enter: 0.68, hold: 0.36, rise: 0.26, fall: 0.14, cooldown: 260 },
    purple: { enter: 0.66, hold: 0.34, rise: 0.24, fall: 0.12, cooldown: 280 },
    void:   { enter: 0.62, hold: 0.33, rise: 0.28, fall: 0.16, cooldown: 380 },
    shrine: { enter: 0.55, hold: 0.28, rise: 0.42, fall: 0.10, cooldown: 320 },
};
const gestureConfidence = { red: 0, blue: 0, purple: 0, void: 0, shrine: 0 };
const gestureCooldownUntil = { red: 0, blue: 0, purple: 0, void: 0, shrine: 0 };
let activeGesture = 'neutral';
let tuneHudEnabled = false;
let lastMudraMetrics = null;
const trackedHands = {
    left: null,
    right: null,
};

const techTheme = {
    neutral: { color:'#00ffff', shadow:'rgba(0,255,255,0.5)'   },
    purple:  { color:'#cc00ff', shadow:'rgba(180,0,255,0.7)'   },
    blue:    { color:'#2080ff', shadow:'rgba(20,100,255,0.8)'  },
    red:     { color:'#ff0a00', shadow:'rgba(200,0,0,0.85)'    },
    void:    { color:'#ffffff', shadow:'rgba(255,255,255,0.6)' },
    shrine:  { color:'#ff3d1f', shadow:'rgba(255,60,20,0.8)'   },
};
const techNames = {
    neutral:'CURSED ENERGY', purple:'SECRET TECHNIQUE: HOLLOW PURPLE',
    blue:'CURSED TECHNIQUE: BLUE', red:'REVERSE CURSED TECHNIQUE: RED',
    void:'DOMAIN EXPANSION: INFINITE VOID', shrine:'DOMAIN EXPANSION: MALEVOLENT SHRINE',
};

const throwableTechs = new Set(['red', 'blue', 'purple']);
let lastPalm = null;
let lastReleaseAt = 0;
let releaseCharge = 0;
let trackTargetX = 0;
let trackOffsetX = 0;
let trackSeenFrames = 0;
let voidStickyFrames = 0;
const VOID_STICKY = 8;
let shrineStickyFrames = 0;
const SHRINE_STICKY = 14;
let twoHandModeFrames = 0;
const TWO_HAND_MUDRA_ARM_FRAMES = 2;
let twoHandLostFrames = 999;
const TWO_HAND_TRACK_GRACE = 12;
let mudraOnlyMode = false;
let noHandsFrames = 0;
const MUDRA_UNLOCK_NO_HANDS = 12;

const releaseFx = {
    active: false,
    tech: 'neutral',
    age: 0,
    duration: 1.2,
    dir: new THREE.Vector3(0, 0, -1),
    burst: 0,
};

const video  = document.querySelector('.input_video');
const canvas = document.getElementById('output_canvas');
const ctx    = canvas.getContext('2d');

const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.35 });

const perfBadge = document.createElement('div');
perfBadge.id = 'perf-badge';
perfBadge.textContent = 'TEST MODE';
perfBadge.style.cssText = [
    'position:fixed',
    'top:16px',
    'right:16px',
    'z-index:35',
    'padding:6px 10px',
    'font:700 11px/1 Space Grotesk, sans-serif',
    'letter-spacing:2px',
    'text-transform:uppercase',
    'color:#e9f6ff',
    'background:rgba(18,28,44,0.64)',
    'border:1px solid rgba(150,210,255,0.45)',
    'border-radius:4px',
    'backdrop-filter:blur(4px)',
    'display:none',
	].join(';');
document.body.appendChild(perfBadge);

const tuneHud = document.createElement('div');
tuneHud.id = 'tune-hud';
tuneHud.style.cssText = [
    'position:fixed',
    'top:52px',
    'right:16px',
    'z-index:36',
    'min-width:260px',
    'padding:10px 12px',
    'font:600 11px/1.35 Space Grotesk, sans-serif',
    'letter-spacing:0.4px',
    'color:#dff1ff',
    'background:rgba(8,14,24,0.75)',
    'border:1px solid rgba(115,180,220,0.45)',
    'border-radius:6px',
    'backdrop-filter:blur(6px)',
    'white-space:pre',
    'display:none',
].join(';');
document.body.appendChild(tuneHud);

function applyPerformanceMode(enabled) {
    perfMode = enabled;
    const pixelRatioCap = enabled ? 0.95 : 2;
    renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatioCap));
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: enabled ? 0 : 1,
        minDetectionConfidence: enabled ? 0.5 : 0.5,
        minTrackingConfidence: enabled ? 0.35 : 0.35,
    });
    perfBadge.style.display = enabled ? 'block' : 'none';
}

function landmarkDist(a, ai, b, bi) {
    return Math.hypot(a[ai].x - b[bi].x, a[ai].y - b[bi].y);
}
function landmarkDist3(a, ai, b, bi) {
    const dx = a[ai].x - b[bi].x;
    const dy = a[ai].y - b[bi].y;
    const dz = (a[ai].z || 0) - (b[bi].z || 0);
    return Math.hypot(dx, dy, dz);
}
function isFingerUp(lm, tip, pip, mcp) {
    return lm[tip].y < lm[pip].y && lm[pip].y < lm[mcp].y;
}
function isFingerCurled(lm, tip, pip, mcp) {
    return lm[tip].y > lm[pip].y || lm[pip].y > lm[mcp].y;
}
function isFingerExtended(lm, tip, pip, mcp, wrist = 0) {
    const tipReach = landmarkDist(lm, tip, lm, wrist);
    const pipReach = landmarkDist(lm, pip, lm, wrist);
    const mcpReach = landmarkDist(lm, mcp, lm, wrist);
    return tipReach > pipReach * 1.07 && tipReach > mcpReach * 1.14;
}
function extendedCountNoThumb(lm) {
    return (
        Number(isFingerExtended(lm, 8, 6, 5)) +
        Number(isFingerExtended(lm, 12, 10, 9)) +
        Number(isFingerExtended(lm, 16, 14, 13)) +
        Number(isFingerExtended(lm, 20, 18, 17))
    );
}
function pairScale(handA, handB) {
    return ((landmarkDist3(handA, 0, handA, 9) + landmarkDist3(handB, 0, handB, 9)) * 0.5) + 1e-6;
}
function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}
function getHandednessEntryLabel(entry) {
    if (!entry) return null;
    if (typeof entry.label === 'string') return entry.label.toLowerCase();
    if (Array.isArray(entry) && entry[0]?.label) return String(entry[0].label).toLowerCase();
    if (entry.classification?.[0]?.label) return String(entry.classification[0].label).toLowerCase();
    return null;
}
function getHandednessEntryScore(entry) {
    if (!entry) return 0;
    if (typeof entry.score === 'number') return entry.score;
    if (Array.isArray(entry) && typeof entry[0]?.score === 'number') return entry[0].score;
    if (typeof entry.classification?.[0]?.score === 'number') return entry.classification[0].score;
    return 0;
}
function wristDist2(a, b) {
    const dx = a[0].x - b.x;
    const dy = a[0].y - b.y;
    return dx * dx + dy * dy;
}
function resolveTwoHandPair(results) {
    const landmarks = results.multiHandLandmarks || [];
    if (landmarks.length < 2) return null;

    const handedness = results.multiHandedness || results.multi_handedness || [];
    const candidates = landmarks.slice(0, 2).map((lm, i) => ({
        lm,
        label: getHandednessEntryLabel(handedness[i]),
        score: getHandednessEntryScore(handedness[i]),
    }));

    let left = null;
    let right = null;
    const leftByLabel = candidates.filter(h => h.label === 'left').sort((a, b) => b.score - a.score)[0] || null;
    const rightByLabel = candidates.filter(h => h.label === 'right').sort((a, b) => b.score - a.score)[0] || null;
    if (leftByLabel && rightByLabel && leftByLabel !== rightByLabel) {
        left = leftByLabel;
        right = rightByLabel;
    }

    if (!left || !right) {
        if (trackedHands.left && trackedHands.right) {
            const h0 = candidates[0];
            const h1 = candidates[1];
            const c00 = wristDist2(h0.lm, trackedHands.left) + wristDist2(h1.lm, trackedHands.right);
            const c01 = wristDist2(h1.lm, trackedHands.left) + wristDist2(h0.lm, trackedHands.right);
            if (c00 <= c01) {
                left = h0;
                right = h1;
            } else {
                left = h1;
                right = h0;
            }
        } else {
            const sorted = [...candidates].sort((a, b) => a.lm[0].x - b.lm[0].x);
            left = sorted[0];
            right = sorted[1];
        }
    }

    trackedHands.left = { x: left.lm[0].x, y: left.lm[0].y };
    trackedHands.right = { x: right.lm[0].x, y: right.lm[0].y };

    return {
        left: left.lm,
        right: right.lm,
        leftLabel: left.label || 'unknown',
        rightLabel: right.label || 'unknown',
    };
}
function stepGestureState(rawGesture, nowMs) {
    for (const key of gestureKeys) {
        const cfg = gestureConfig[key];
        const current = gestureConfidence[key];
        if (rawGesture === key) {
            gestureConfidence[key] = clamp01(current + cfg.rise * (1 - current));
        } else {
            gestureConfidence[key] = clamp01(current - cfg.fall);
        }
    }

    if (activeGesture === 'neutral') {
        let best = 'neutral';
        let bestConf = 0;
        for (const key of gestureKeys) {
            if (nowMs < gestureCooldownUntil[key]) continue;
            const conf = gestureConfidence[key];
            if (conf >= gestureConfig[key].enter && conf > bestConf) {
                best = key;
                bestConf = conf;
            }
        }
        activeGesture = best;
    } else {
        const holdCfg = gestureConfig[activeGesture];
        const holdConf = gestureConfidence[activeGesture];
        let switched = false;
        for (const key of gestureKeys) {
            if (key === activeGesture) continue;
            if (nowMs < gestureCooldownUntil[key]) continue;
            const conf = gestureConfidence[key];
            if (conf >= gestureConfig[key].enter + 0.08 && conf > holdConf + 0.06) {
                gestureCooldownUntil[activeGesture] = nowMs + holdCfg.cooldown;
                activeGesture = key;
                switched = true;
                break;
            }
        }
        if (!switched && holdConf < holdCfg.hold) {
            gestureCooldownUntil[activeGesture] = nowMs + holdCfg.cooldown;
            activeGesture = 'neutral';
        }
    }

    updateState(activeGesture);
}
function formatHudNum(v) {
    return Number.isFinite(v) ? v.toFixed(3) : '-';
}
function renderTuneHud(frame) {
    if (!tuneHudEnabled) {
        tuneHud.style.display = 'none';
        return;
    }
    tuneHud.style.display = 'block';
    const m = frame.mudra;
    const mudraLines = m
        ? [
            `mudra matched: ${m.matched}`,
            `mudra score: ${m.score}/${m.targetScore}`,
            `joinedSignals: ${m.joinedSignals}/${m.requiredJoinedSignals}`,
            `palmGap: ${formatHudNum(m.palmGap)} wristGap: ${formatHudNum(m.wristGap)}`,
            `indexGap: ${formatHudNum(m.indexGap)} thumbGap: ${formatHudNum(m.thumbGap)}`,
            `wristYGap: ${formatHudNum(m.wristYGap)} wristLink: ${m.wristsCrossLinked}`,
            `totalFolded: ${m.totalFoldedNonIndex} joined: ${m.joinedSignals}/${m.requiredJoinedSignals}`,
            `wideWristGap: ${m.wideWristGap} handsJoined: ${m.handsJoinedForCast}`,
            `openReject: ${m.bothHandsOpen} extraScore: +${m.extraScoreRequirement}`,
        ].join('\n')
        : 'mudra matched: -\nmudra score: -';

    tuneHud.textContent = [
        `hands: ${frame.handCount} left:${frame.leftLabel} right:${frame.rightLabel}`,
        `mudraMode: ${frame.mudraOnlyMode}`,
        `raw: ${frame.rawDetected} active: ${activeGesture}`,
        `conf red:${gestureConfidence.red.toFixed(2)} blue:${gestureConfidence.blue.toFixed(2)} purple:${gestureConfidence.purple.toFixed(2)}`,
        `conf void:${gestureConfidence.void.toFixed(2)} shrine:${gestureConfidence.shrine.toFixed(2)}`,
        mudraLines,
    ].join('\n');
}
function getHandGesture(lm) {
    const indexUp = isFingerUp(lm, 8, 6, 5);
    const middleUp = isFingerUp(lm, 12, 10, 9);
    const ringUp = isFingerUp(lm, 16, 14, 13);
    const pinkyUp = isFingerUp(lm, 20, 18, 17);
    const indexExtended = isFingerExtended(lm, 8, 6, 5);
    const middleExtended = isFingerExtended(lm, 12, 10, 9);
    const ringExtended = isFingerExtended(lm, 16, 14, 13);
    const pinkyExtended = isFingerExtended(lm, 20, 18, 17);
    const pinch = landmarkDist(lm, 8, lm, 4);
    const palm = landmarkDist(lm, 0, lm, 9) + 1e-6;
    const pinchNorm = pinch / palm;

    const tipToBaseIndex = landmarkDist(lm, 8, lm, 5) / palm;
    const tipToBaseMiddle = landmarkDist(lm, 12, lm, 9) / palm;
    const tipToBaseRing = landmarkDist(lm, 16, lm, 13) / palm;
    const tipToBasePinky = landmarkDist(lm, 20, lm, 17) / palm;
    const thumbTipToWrist = landmarkDist(lm, 4, lm, 0) / palm;
    const thumbBaseToWrist = landmarkDist(lm, 2, lm, 0) / palm;
    const thumbIndexGap = landmarkDist(lm, 4, lm, 8) / palm;
    const thumbSpan = landmarkDist(lm, 4, lm, 2) / palm;
    const fistShape =
        tipToBaseIndex < 0.78 &&
        tipToBaseMiddle < 0.78 &&
        tipToBaseRing < 0.78 &&
        tipToBasePinky < 0.78;

    const purplePinch = pinchNorm < 0.28 && !fistShape;
    const blueFist =
        fistShape &&
        !indexExtended &&
        !middleExtended &&
        !ringExtended &&
        !pinkyExtended &&
        pinchNorm > 0.24;
    const noThumbExtended = extendedCountNoThumb(lm);
    const ringCurled = isFingerCurled(lm, 16, 14, 13);
    const pinkyCurled = isFingerCurled(lm, 20, 18, 17);
    const thumbOutScore =
        Number(thumbTipToWrist > thumbBaseToWrist * 1.10) +
        Number(thumbTipToWrist > 0.6) +
        Number(thumbIndexGap > 0.42) +
        Number(thumbSpan > 0.33);
    const midTipToIdxTip = landmarkDist(lm, 12, lm, 8) / palm;
    const midToIndexPip = landmarkDist(lm, 12, lm, 6) / palm;
    const midToIndexBase = landmarkDist(lm, 12, lm, 5) / palm;
    const idxVx = lm[8].x - lm[5].x;
    const idxVy = lm[8].y - lm[5].y;
    const idxLen2 = idxVx * idxVx + idxVy * idxVy + 1e-6;
    const projT = Math.max(0, Math.min(1, ((lm[12].x - lm[5].x) * idxVx + (lm[12].y - lm[5].y) * idxVy) / idxLen2));
    const projX = lm[5].x + projT * idxVx;
    const projY = lm[5].y + projT * idxVy;
    const midToIndexLine = Math.hypot(lm[12].x - projX, lm[12].y - projY) / palm;
    const ringTucked = tipToBaseRing < 0.84;
    const pinkyTucked = tipToBasePinky < 0.84;
    const ringDownVoid = (!ringUp && ringCurled) || tipToBaseRing < 0.94 || lm[16].y > lm[12].y + 0.03;
    const pinkyDownVoid = (!pinkyUp && pinkyCurled) || tipToBasePinky < 0.94 || lm[20].y > lm[12].y + 0.03;
    const middleCurled = isFingerCurled(lm, 12, 10, 9) || tipToBaseMiddle < 0.9;
    const indexMiddleClose = midTipToIdxTip < 0.78 && Math.abs(lm[8].x - lm[12].x) / palm < 0.35;
    const openPalmLike =
        noThumbExtended >= 3 &&
        indexUp &&
        middleUp &&
        (ringUp || ringExtended) &&
        (pinkyUp || pinkyExtended) &&
        tipToBaseRing > 0.92 &&
        tipToBasePinky > 0.92;

    const midIdxXGap = Math.abs(lm[8].x - lm[12].x) / palm;
    const midIdxYGap = Math.abs(lm[8].y - lm[12].y) / palm;
    const midTipBelowIdxTip = lm[12].y > lm[8].y;
    const middleNotFreestanding = !middleUp || midTipToIdxTip < 0.25;

    const tipsOverlapping = midTipToIdxTip < 0.18 && midIdxXGap < 0.10;
    const midOnIdxLine = midToIndexLine < 0.06 && projT > 0.25 && projT < 1.05;
    const midBehindIndex = midIdxXGap < 0.10 && midTipToIdxTip < 0.25 && midTipBelowIdxTip;

    const fingersCrossed =
        (indexUp || indexExtended) &&
        middleNotFreestanding &&
        (tipsOverlapping || midOnIdxLine || midBehindIndex) &&
        noThumbExtended <= 2;

    const voidPose =
        !openPalmLike &&
        fingersCrossed &&
        (indexUp || indexExtended) &&
        (!ringExtended && !pinkyExtended);

    const dbg = document.getElementById('debug');
    if (dbg && dbg.style.display !== 'none') {
        dbg.textContent =
            `midTipToIdxTip: ${midTipToIdxTip.toFixed(3)}\n` +
            `midIdxXGap:     ${midIdxXGap.toFixed(3)}\n` +
            `midToIndexLine: ${midToIndexLine.toFixed(3)}\n` +
            `projT:          ${projT.toFixed(3)}\n` +
            `middleUp:       ${middleUp}\n` +
            `midBelowIdx:    ${midTipBelowIdxTip}\n` +
            `midNotFree:     ${middleNotFreestanding}\n` +
            `tipsOverlap:    ${tipsOverlapping}\n` +
            `midOnLine:      ${midOnIdxLine}\n` +
            `midBehind:      ${midBehindIndex}\n` +
            `noThumbExt:     ${noThumbExtended}\n` +
            `fingersCrossed: ${fingersCrossed}\n` +
            `voidPose:       ${voidPose}`;
    }

    const redPose =
        !fingersCrossed &&
        (indexUp || indexExtended) &&
        thumbOutScore >= 2 &&
        !ringExtended && !pinkyExtended &&
        (ringCurled || ringTucked) &&
        (pinkyCurled || pinkyTucked);

    if (voidPose) return 'void';
    if (redPose) return 'red';
    if (purplePinch) return 'purple';
    if (blueFist) return 'blue';
    return 'open';
}
function evaluateSukunaMudra(left, right) {
    const scale = pairScale(left, right);

    const leftIndexUp = isFingerUp(left, 8, 6, 5);
    const rightIndexUp = isFingerUp(right, 8, 6, 5);
    const leftIndexExtended = isFingerExtended(left, 8, 6, 5);
    const rightIndexExtended = isFingerExtended(right, 8, 6, 5);
    const leftMiddleCurled = isFingerCurled(left, 12, 10, 9);
    const rightMiddleCurled = isFingerCurled(right, 12, 10, 9);
    const leftRingCurled = isFingerCurled(left, 16, 14, 13);
    const rightRingCurled = isFingerCurled(right, 16, 14, 13);
    const leftPinkyCurled = isFingerCurled(left, 20, 18, 17);
    const rightPinkyCurled = isFingerCurled(right, 20, 18, 17);
    const leftExtCount = extendedCountNoThumb(left);
    const rightExtCount = extendedCountNoThumb(right);
    const leftFoldedNonIndex =
        Number(leftMiddleCurled) + Number(leftRingCurled) + Number(leftPinkyCurled);
    const rightFoldedNonIndex =
        Number(rightMiddleCurled) + Number(rightRingCurled) + Number(rightPinkyCurled);
    const curledCount =
        Number(leftMiddleCurled) +
        Number(rightMiddleCurled) +
        Number(leftRingCurled) +
        Number(rightRingCurled) +
        Number(leftPinkyCurled) +
        Number(rightPinkyCurled);

    const indexGap = landmarkDist3(left, 8, right, 8) / scale;
    const thumbGap = landmarkDist3(left, 4, right, 4) / scale;
    const middleGap = landmarkDist3(left, 12, right, 12) / scale;
    const wristGap = landmarkDist3(left, 0, right, 0) / scale;
    const palmGap = landmarkDist3(left, 9, right, 9) / scale;
    const wristYGap = Math.abs(left[0].y - right[0].y);
    const wristToOppPalm =
        (landmarkDist3(left, 0, right, 9) + landmarkDist3(right, 0, left, 9)) * 0.5 / scale;
    const wristToOppIndex =
        (landmarkDist3(left, 0, right, 8) + landmarkDist3(right, 0, left, 8)) * 0.5 / scale;
    const indexToOppThumb =
        (landmarkDist3(left, 8, right, 4) + landmarkDist3(right, 8, left, 4)) * 0.5 / scale;

    const idxMid = {
        x: (left[8].x + right[8].x) * 0.5,
        y: (left[8].y + right[8].y) * 0.5,
        z: ((left[8].z || 0) + (right[8].z || 0)) * 0.5,
    };
    const thumbMid = {
        x: (left[4].x + right[4].x) * 0.5,
        y: (left[4].y + right[4].y) * 0.5,
        z: ((left[4].z || 0) + (right[4].z || 0)) * 0.5,
    };
    const ax = thumbMid.x - idxMid.x;
    const ay = thumbMid.y - idxMid.y;
    const az = thumbMid.z - idxMid.z;
    const axisLen2 = ax * ax + ay * ay + az * az + 1e-6;
    const idxThumbSpan = Math.hypot(ax, ay, az) / scale;

    const projectMiddle = hand => {
        const mx = hand[12].x - idxMid.x;
        const my = hand[12].y - idxMid.y;
        const mz = (hand[12].z || 0) - idxMid.z;
        const t = (mx * ax + my * ay + mz * az) / axisLen2;
        const px = idxMid.x + ax * t;
        const py = idxMid.y + ay * t;
        const pz = idxMid.z + az * t;
        const off = Math.hypot(hand[12].x - px, hand[12].y - py, (hand[12].z || 0) - pz) / scale;
        return { t, off };
    };
    const leftMid = projectMiddle(left);
    const rightMid = projectMiddle(right);
    const middleOnAxis =
        leftMid.t > -0.2 && leftMid.t < 1.2 &&
        rightMid.t > -0.2 && rightMid.t < 1.2 &&
        leftMid.off < 1.3 && rightMid.off < 1.3;
    const indexAligned = Math.abs(left[8].y - right[8].y) < 0.7;
    const thumbAligned = Math.abs(left[4].y - right[4].y) < 0.75;

    const ringPinkyCurledCount =
        Number(leftRingCurled) + Number(rightRingCurled) + Number(leftPinkyCurled) + Number(rightPinkyCurled);
    const indexReady =
        (leftIndexExtended || leftIndexUp) &&
        (rightIndexExtended || rightIndexUp);
    const closeHands = wristGap < 1.1 || palmGap < 1.15;
    const wristAligned = wristYGap < 0.72;
    const wristsNearby = wristGap > 0.15 && wristGap < 2.8;
    const wristsCrossLinked = wristToOppPalm < 2.4 || wristToOppIndex < 2.5;
    const wideWristGap = wristGap > 1.5;
    const requiredJoinedSignals = wideWristGap ? 4 : 2;
    const extraScoreRequirement = wideWristGap ? 1 : 0;
    const joinedSignals =
        Number(palmGap < 1.8) +
        Number(wristGap < 2.5) +
        Number(indexGap < 1.8) +
        Number(thumbGap < 1.8) +
        Number(wristAligned) +
        Number(wristsNearby) +
        Number(wristsCrossLinked);
    const handsJoinedForCast = joinedSignals >= requiredJoinedSignals;
    const totalFoldedNonIndex = leftFoldedNonIndex + rightFoldedNonIndex;
    const bothHandsOpen =
        leftExtCount >= 4 &&
        rightExtCount >= 4 &&
        totalFoldedNonIndex === 0;

    if (!handsJoinedForCast || bothHandsOpen || totalFoldedNonIndex === 0) {
        const targetScore = (closeHands ? 6 : 7) + extraScoreRequirement;
        return {
            matched: false,
            score: 0,
            targetScore,
            joinedSignals,
            requiredJoinedSignals,
            palmGap,
            wristGap,
            indexGap,
            thumbGap,
            wristYGap,
            wristAligned,
            wristsNearby,
            wristsCrossLinked,
            wideWristGap,
            extraScoreRequirement,
            handsJoinedForCast,
            bothHandsOpen,
            totalFoldedNonIndex,
        };
    }

    let score = 0;
    if (indexReady) score++;
    if (leftMiddleCurled || rightMiddleCurled || middleGap < 1.6) score++;
    if (ringPinkyCurledCount >= 1) score++;
    if (indexGap < 1.7) score++;
    if (thumbGap < 1.7) score++;
    if (middleGap < 2.0) score++;
    if (indexToOppThumb < 1.9) score++;
    if (wristAligned) score++;
    if (wristsNearby) score++;
    if (wristsCrossLinked) score++;
    if (idxThumbSpan > 0.08 && idxThumbSpan < 2.0) score++;
    if (wristGap > 0.2 && wristGap < 4.8) score++;
    if (palmGap < 3.2) score++;
    if (middleOnAxis) score++;
    if (indexAligned) score++;
    if (thumbAligned) score++;

    const targetScore = (closeHands ? 6 : 7) + extraScoreRequirement;
    return {
        matched: score >= targetScore,
        score,
        targetScore,
        joinedSignals,
        requiredJoinedSignals,
        palmGap,
        wristGap,
        indexGap,
        thumbGap,
        wristYGap,
        wristAligned,
        wristsNearby,
        wristsCrossLinked,
        wideWristGap,
        extraScoreRequirement,
        handsJoinedForCast,
        bothHandsOpen,
        totalFoldedNonIndex,
    };
}
hands.onResults(results => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let detected = 'neutral';
    let voidPoseHeld = false;
    let shrinePoseHeld = false;
    const nowMs = performance.now();
    const handCount = results.multiHandLandmarks?.length || 0;
    const frameHud = {
        handCount,
        leftLabel: '-',
        rightLabel: '-',
        rawDetected: 'neutral',
        mudra: null,
        mudraOnlyMode,
    };
    if (handCount > 0) noHandsFrames = 0;
    else noHandsFrames++;
    if (handCount >= 2) {
        twoHandLostFrames = 0;
        mudraOnlyMode = true;
    } else {
        twoHandLostFrames++;
    }
    if (noHandsFrames >= MUDRA_UNLOCK_NO_HANDS) mudraOnlyMode = false;
    frameHud.mudraOnlyMode = mudraOnlyMode;

    if (handCount > 0) {
        const drawHandsNow = !perfMode || ((handDrawTick++ % 2) === 0);
        if (drawHandsNow) {
            const lineWidth = perfMode ? 2 : 4;
            const dotRadius = perfMode ? 1.2 : 2;
            results.multiHandLandmarks.forEach(lm => {
                drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: glowColor, lineWidth });
                drawLandmarks(ctx, lm, { color: '#fff', lineWidth: 1, radius: dotRadius });
            });
        }

        if (handCount >= 2) {
            const pair = resolveTwoHandPair(results) || {
                left: results.multiHandLandmarks[0],
                right: results.multiHandLandmarks[1],
                leftLabel: 'unknown',
                rightLabel: 'unknown',
            };
            const a = pair.left;
            const b = pair.right;
            frameHud.leftLabel = pair.leftLabel;
            frameHud.rightLabel = pair.rightLabel;
            const mudra = evaluateSukunaMudra(a, b);
            lastMudraMetrics = mudra;
            frameHud.mudra = mudra;
            sukunaGuide.classList.add('two-hands');
            lastPalm = null;
            releaseCharge = 0;
            trackSeenFrames = 0;
            voidStickyFrames = 0;
            twoHandModeFrames++;

            if (twoHandModeFrames <= TWO_HAND_MUDRA_ARM_FRAMES) {
                shrineStickyFrames = 0;
                detected = 'neutral';
                sukunaGuide.classList.remove('matched');
            } else if (mudra.matched) {
                shrineStickyFrames = SHRINE_STICKY;
                detected = 'shrine';
                sukunaGuide.classList.add('matched');
            } else if (shrineStickyFrames > 0) {
                shrineStickyFrames--;
                detected = 'shrine';
                sukunaGuide.classList.add('matched');
            } else {
                detected = 'neutral';
                sukunaGuide.classList.remove('matched');
            }
            shrinePoseHeld = detected === 'shrine';

        } else {
            if (mudraOnlyMode) {
                frameHud.mudra = lastMudraMetrics;
                sukunaGuide.classList.add('two-hands');
                sukunaGuide.classList.remove('matched');
                detected = 'neutral';
                lastPalm = null;
                releaseCharge = 0;
                trackSeenFrames = 0;
                voidStickyFrames = 0;
            } else {
                const keepTwoHandMode = twoHandModeFrames > 0 && twoHandLostFrames <= TWO_HAND_TRACK_GRACE;
                if (keepTwoHandMode) {
                    frameHud.mudra = lastMudraMetrics;
                    sukunaGuide.classList.add('two-hands');
                    sukunaGuide.classList.remove('matched');
                    detected = 'neutral';
                    lastPalm = null;
                    releaseCharge = 0;
                    trackSeenFrames = 0;
                    voidStickyFrames = 0;
                } else {
                    twoHandModeFrames = 0;
                    shrineStickyFrames = Math.max(0, shrineStickyFrames - 1);
                    sukunaGuide.classList.remove('two-hands', 'matched');
                    const lm = results.multiHandLandmarks[0];
                    const handedness = results.multiHandedness || results.multi_handedness || [];
                    frameHud.leftLabel = getHandednessEntryLabel(handedness[0]) || '-';
                    lastMudraMetrics = null;
                    const gesture = getHandGesture(lm);
                    voidPoseHeld = gesture === 'void';
                    const palm = lm[9];
                    const palmVelX = lastPalm ? palm.x - lastPalm.x : 0;
                    const palmVelY = lastPalm ? palm.y - lastPalm.y : 0;
                    const speed = Math.hypot(palmVelX, palmVelY);

                    const positionTrackActive = currentTech === 'red' || currentTech === 'blue';
                    if (positionTrackActive) {
                        trackTargetX = Math.max(-1, Math.min(1, (0.5 - palm.x) * 2.0));
                        trackSeenFrames = 12;
                    } else {
                        trackTargetX = 0;
                        trackSeenFrames = 0;
                    }

                    if (throwableTechs.has(currentTech) && gesture !== 'open') {
                        releaseCharge = Math.min(1, releaseCharge + 0.22);
                    } else {
                        releaseCharge = Math.max(0, releaseCharge - 0.08);
                    }

                    const canRelease =
                        currentTech !== 'neutral' &&
                        throwableTechs.has(currentTech) &&
                        gesture === 'open' &&
                        releaseCharge > 0.48 &&
                        speed > 0.009 &&
                        nowMs - lastReleaseAt > 420;
                    if (canRelease) {
                        triggerRelease(currentTech, palmVelX, palmVelY);
                        lastReleaseAt = nowMs;
                        releaseCharge = 0;
                    }

                    if (gesture === 'void') {
                        voidStickyFrames = VOID_STICKY;
                        detected = 'void';
                    } else if (voidStickyFrames > 0 && currentTech === 'void' && (gesture === 'red' || gesture === 'open')) {
                        voidStickyFrames--;
                        detected = 'void';
                    } else {
                        voidStickyFrames = Math.max(0, voidStickyFrames - 1);
                        if (gesture === 'purple' || gesture === 'blue' || gesture === 'red') {
                            detected = gesture;
                        }
                    }
                    lastPalm = { x: palm.x, y: palm.y };
                }
            }
        }
    } else {
        if (!mudraOnlyMode) {
            lastMudraMetrics = null;
            trackedHands.left = null;
            trackedHands.right = null;
            twoHandLostFrames = 999;
            twoHandModeFrames = 0;
            sukunaGuide.classList.remove('two-hands', 'matched');
        } else {
            sukunaGuide.classList.add('two-hands');
            sukunaGuide.classList.remove('matched');
            detected = 'neutral';
        }
        shrineStickyFrames = Math.max(0, shrineStickyFrames - 1);
        lastPalm = null;
        releaseCharge = Math.max(0, releaseCharge - 0.12);
        trackSeenFrames = Math.max(0, trackSeenFrames - 1);
        voidStickyFrames = Math.max(0, voidStickyFrames - 1);
    }

    if (!voidPoseHeld) stopAudio('void', { immediate: true, pause: true });
    if (!shrinePoseHeld) stopAudio('shrine', { immediate: true, pause: true });
    if (voidPoseHeld) {
        const b = audioBank.void;
        if (b && !b.source && b.pauseOffset > 0) {
            playAudio('void', { loop: false, cooldownMs: 120, fadeInMs: 90, gain: 0.72, resumeWindowMs: 2200 });
        }
    }
    if (shrinePoseHeld) {
        const b = audioBank.shrine;
        if (b && !b.source && b.pauseOffset > 0) {
            playAudio('shrine', { loop: false, cooldownMs: 120, fadeInMs: 80, gain: 0.86, resumeWindowMs: 2800 });
        }
    }
    frameHud.rawDetected = detected;
    if (mudraOnlyMode) {
        gestureConfidence.red = 0;
        gestureConfidence.blue = 0;
        gestureConfidence.purple = 0;
        gestureConfidence.void = 0;
        if (activeGesture !== 'neutral' && activeGesture !== 'shrine') activeGesture = 'neutral';
        if (detected !== 'shrine') detected = 'neutral';
        frameHud.rawDetected = detected;
    }
    stepGestureState(detected, nowMs);
    renderTuneHud(frameHud);
});

function updateState(tech) {
    if (currentTech === tech) return;
    currentTech = tech;
    techTime = 0;
    initPhases();
    releaseFx.active = false;
    releaseFx.burst = 0;

    const theme = techTheme[tech] || techTheme.neutral;
    const nameEl = document.getElementById('technique-name');
    nameEl.innerText = techNames[tech] || '';
    nameEl.style.color = theme.color;
    nameEl.style.textShadow = `0 0 12px ${theme.shadow}`;
    glowColor = theme.color;
    lerpRate = tech === 'neutral' ? 0.07 : 0.12;
    shakeDecay = tech !== 'neutral' ? 1.0 : 0;
    shakeTime = 0;

    shrineOverlay.classList.toggle('active', tech === 'shrine');
    if (tech === 'void') {
        document.body.style.background = `
            radial-gradient(circle at 50% 50%, rgba(0,0,0,0.98) 0%, rgba(4,10,28,0.96) 14%, rgba(35,78,160,0.24) 24%, rgba(8,24,66,0.56) 38%, rgba(1,4,12,0.96) 70%, #000 100%),
            radial-gradient(circle at 50% 50%, rgba(182,229,255,0.12) 0%, rgba(68,150,255,0.08) 12%, rgba(0,0,0,0) 30%)
        `;
        playAudio('void', { loop: false, cooldownMs: 120, fadeInMs: 90, gain: 0.72, resumeWindowMs: 2200 });
    } else {
        if (tech === 'shrine') {
            playAudio('shrine', { loop: false, cooldownMs: 120, fadeInMs: 80, gain: 0.86, resumeWindowMs: 2800 });
        }
        if (tech === 'red') {
            document.body.style.background = `
                radial-gradient(circle at 52% 48%, rgba(255,72,56,0.34) 0%, rgba(255,48,36,0.20) 12%, rgba(180,0,0,0.06) 30%, rgba(0,0,0,0.90) 58%),
                radial-gradient(circle at center, #a60000 0%, #400000 35%, #090000 70%, #000 100%)
            `;
        } else if (tech === 'blue') {
            document.body.style.background = `
                radial-gradient(circle at 50% 50%, rgba(70,168,255,0.30) 0%, rgba(40,115,215,0.12) 14%, rgba(14,58,138,0.10) 30%, rgba(2,20,52,0.92) 62%),
                radial-gradient(circle at center, #0b2f69 0%, #041327 38%, #020913 66%, #000 100%)
            `;
        } else if (tech === 'shrine') {
            document.body.style.background = `
                radial-gradient(circle at 50% 76%, rgba(225,36,15,0.28) 0%, rgba(116,12,8,0.32) 24%, rgba(16,2,2,0.94) 66%, #000 100%),
                radial-gradient(circle at 52% 20%, rgba(255,126,70,0.14) 0%, rgba(52,10,8,0.12) 26%, rgba(0,0,0,0) 54%),
                linear-gradient(180deg, rgba(16,2,2,0.55) 0%, rgba(3,1,1,0.88) 56%, rgba(0,0,0,1) 100%)
            `;
        } else {
            document.body.style.background = '#000';
        }
    }

    if (tech === 'void') {
        const bgStart = Math.floor(COUNT * 0.74);
        const bgCount = COUNT - bgStart;
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = bgStart; i < COUNT; i++) {
            const idx = i - bgStart;
            const yNorm = 1 - ((idx + 0.5) / bgCount) * 2;
            const radial = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
            const th = idx * golden;
            const rad = 64 + phases[i] * 96;
            voidBg[i*3] = Math.cos(th) * radial * rad;
            voidBg[i*3+1] = yNorm * rad;
            voidBg[i*3+2] = Math.sin(th) * radial * rad;
        }
    }

    if (tech === 'void') animateVoid(0);
    else if (tech === 'red') animateRed(0);
    else if (tech === 'blue') animateBlue(0);
    else if (tech === 'purple') animatePurple(0);
    else if (tech === 'shrine') animateShrine(0);
    else animateNeutral(0);

    if (tech === 'red' || tech === 'blue') {
        geo.attributes.position.array.set(targetPositions);
        geo.attributes.color.array.set(targetColors);
        geo.attributes.size.array.set(targetSizes);
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        geo.attributes.size.needsUpdate = true;
    }
}

const cam = new Camera(video, {
    onFrame: async () => { canvas.width = video.videoWidth; canvas.height = video.videoHeight; await hands.send({image:video}); },
    width: 480, height: 360,
});
cam.start();

let lastFrame = performance.now();
let shakeWasActive = false;

function animate(now) {
    requestAnimationFrame(animate);

    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    simAccumDt += dt;

    if (shakeDecay > 0.01) {
        shakeDecay *= 0.96;
        const amp = shakeDecay * 10;
        const sx = Math.sin(shakeTime*19)*amp + Math.sin(shakeTime*37)*amp*0.4;
        const sy = Math.cos(shakeTime*23)*amp + Math.cos(shakeTime*13)*amp*0.3;
        renderer.domElement.style.transform = `translate(${sx}px, ${sy}px)`;
        shakeTime += 0.06;
        shakeWasActive = true;
    } else if (shakeWasActive) {
        renderer.domElement.style.transform = '';
        shakeDecay = 0;
        shakeWasActive = false;
    }

    const simStep = perfMode ? 3 : 1;
    const shouldSimulate = (animFrameTick++ % simStep) === 0;
    if (shouldSimulate) {
        const simDt = Math.min(simAccumDt, 0.12);
        simAccumDt = 0;
        techTime += simDt;

        if      (currentTech === 'void')   animateVoid(techTime);
        else if (currentTech === 'red')    animateRed(techTime);
        else if (currentTech === 'blue')   animateBlue(techTime);
        else if (currentTech === 'purple') animatePurple(techTime);
        else if (currentTech === 'shrine') animateShrine(techTime);
        else                               animateNeutral(techTime);

        applyReleaseOverlay(simDt);

        if (trackSeenFrames > 0) {
            trackSeenFrames--;
        } else {
            trackTargetX *= 0.85;
            if (Math.abs(trackTargetX) < 0.002) trackTargetX = 0;
        }
        trackOffsetX += (trackTargetX - trackOffsetX) * 0.18;
        const shouldTrack = currentTech === 'red' || currentTech === 'blue';
        if (shouldTrack) {
            const xShift = trackOffsetX * 26;
            for (let i = 0; i < COUNT; i++) {
                targetPositions[i*3] += xShift;
            }
        }

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

    starField.rotation.y += 0.0003;
    renderer.render(scene, camera);
}
requestAnimationFrame(animate);

document.getElementById('debug').style.display = 'none';
window.addEventListener('keydown', e => {
    if (e.key === 'n' || e.key === 'N') {
        const d = document.getElementById('debug');
        d.style.display = d.style.display === 'none' ? '' : 'none';
    } else if (e.key === 't' || e.key === 'T') {
        applyPerformanceMode(!perfMode);
    } else if (e.key === 'h' || e.key === 'H') {
        tuneHudEnabled = !tuneHudEnabled;
        if (!tuneHudEnabled) tuneHud.style.display = 'none';
    }
});

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
