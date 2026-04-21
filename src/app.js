import { COUNT } from './utils.js';
import { state } from './state.js';
import { scene, camera, renderer, starField, handleResize, composer, bloomPass, bloomStrengths } from './engine/scene.js';
import { targetPositions, lerpParticles, setShaderTime } from './engine/particles.js';
import { updateState } from './ui/theme.js';
import { setActiveGesture, setDevOverride } from './gestures/state.js';
import { animateNeutral } from './techniques/neutral.js';
import { animateRed } from './techniques/red.js';
import { animateBlue } from './techniques/blue.js';
import { animatePurple } from './techniques/purple.js';
import { animateVoid } from './techniques/void.js';
import { animateShrine } from './techniques/shrine.js';
import { animateChimera } from './techniques/chimera.js';
import { applyReleaseOverlay } from './techniques/release.js';
import { setupHands } from './gestures/hands.js';
import { createPerfBadge, createTuneHud, applyPerformanceMode } from './ui/overlays.js';
import './audio/audio.js';

// create UI elements
state.perfBadge = createPerfBadge();
state.tuneHud = createTuneHud();

// init hand tracking
const video = document.querySelector('.input_video');
const canvas = document.getElementById('output_canvas');
const hands = setupHands(video, canvas);

// debug panel
document.getElementById('debug').style.display = 'none';

// keyboard shortcuts
window.addEventListener('keydown', e => {
    if (e.key === 'n' || e.key === 'N') {
        const d = document.getElementById('debug');
        d.style.display = d.style.display === 'none' ? '' : 'none';
    } else if (e.key === 't' || e.key === 'T') {
        applyPerformanceMode(!state.perfMode, hands);
    } else if (e.key === 'h' || e.key === 'H') {
        state.tuneHudEnabled = !state.tuneHudEnabled;
        if (!state.tuneHudEnabled) state.tuneHud.style.display = 'none';
    } else if (e.key === 'c' || e.key === 's') {
        const tech = e.key === 'c' ? 'chimera' : 'shrine';
        if (state.currentTech === tech) {
            setDevOverride(false);
            state.currentTech = null;
            setActiveGesture('neutral');
            updateState('neutral');
        } else {
            setDevOverride(true);
            state.currentTech = null;
            setActiveGesture(tech);
            updateState(tech);
        }
    }
});

window.addEventListener('resize', handleResize);

// render loop
let lastFrame = performance.now();
let shakeWasActive = false;

function animate(now) {
    requestAnimationFrame(animate);

    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    state.simAccumDt += dt;

    // screen shake — shrine/void rumble slower, red/purple snap fast
    if (state.shakeDecay > 0.01) {
        const isBuildup = state.currentTech === 'void' || state.currentTech === 'shrine' || state.currentTech === 'chimera';
        state.shakeDecay *= isBuildup ? 0.985 : 0.955;
        const amp = state.shakeDecay * (isBuildup ? 6 : 10);
        const sx = Math.sin(state.shakeTime * 19) * amp + Math.sin(state.shakeTime * 37) * amp * 0.4;
        const sy = Math.cos(state.shakeTime * 23) * amp + Math.cos(state.shakeTime * 13) * amp * 0.3;
        renderer.domElement.style.transform = `translate(${sx}px, ${sy}px)`;
        state.shakeTime += isBuildup ? 0.04 : 0.06;
        shakeWasActive = true;
    } else if (shakeWasActive) {
        renderer.domElement.style.transform = '';
        state.shakeDecay = 0;
        shakeWasActive = false;
    }

    // simulation step
    const simStep = state.perfMode ? 3 : 1;
    const shouldSimulate = (state.animFrameTick++ % simStep) === 0;
    if (shouldSimulate) {
        const simDt = Math.min(state.simAccumDt, 0.12);
        state.simAccumDt = 0;
        state.techTime += simDt;

        if      (state.currentTech === 'void')   animateVoid(state.techTime);
        else if (state.currentTech === 'red')    animateRed(state.techTime);
        else if (state.currentTech === 'blue')   animateBlue(state.techTime);
        else if (state.currentTech === 'purple') animatePurple(state.techTime);
        else if (state.currentTech === 'shrine')  animateShrine(state.techTime);
        else if (state.currentTech === 'chimera') animateChimera(state.techTime);
        else                                      animateNeutral(state.techTime);

        applyReleaseOverlay(simDt);

        // hand position tracking
        if (state.trackSeenFrames > 0) {
            state.trackSeenFrames--;
        } else {
            state.trackTargetX *= 0.85;
            if (Math.abs(state.trackTargetX) < 0.002) state.trackTargetX = 0;
        }
        state.trackOffsetX += (state.trackTargetX - state.trackOffsetX) * 0.18;
        const shouldTrack = state.currentTech === 'red' || state.currentTech === 'blue' || state.currentTech === 'purple';
        if (shouldTrack) {
            const xShift = state.trackOffsetX * 26;
            for (let i = 0; i < COUNT; i++) {
                targetPositions[i * 3] += xShift;
            }
        }

        lerpParticles(state.lerpRate);
    }

    // lerp bloom — slower for buildup techniques so it ramps with the reveal
    const targetBloom = bloomStrengths[state.currentTech] || 0.5;
    const bloomBuildup = (state.currentTech === 'void' || state.currentTech === 'shrine' || state.currentTech === 'chimera') ? 0.018 : 0.04;
    bloomPass.strength += (targetBloom - bloomPass.strength) * bloomBuildup;

    setShaderTime(now * 0.001);
    starField.rotation.y += 0.0003;
    composer.render();
}
requestAnimationFrame(animate);
