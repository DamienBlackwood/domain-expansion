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

state.perfBadge = createPerfBadge();
state.tuneHud = createTuneHud();

const video = document.querySelector('.input_video');
const canvas = document.getElementById('output_canvas');
const hands = setupHands(video, canvas);

const debugEl = document.getElementById('debug');
window.addEventListener('keydown', e => {
    if (e.key === 'n' || e.key === 'N') {
        debugEl.style.display = debugEl.style.display === 'block' ? 'none' : 'block';
    } else if (e.key === 't' || e.key === 'T') {
        userForcedPerf = true; 
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


let lastFrame = performance.now();
let shakeWasActive = false;

let fpsAvg = 60;
let lowStreak = 0;
let highStreak = 0;
let userForcedPerf = false;

function animate(now) {
    requestAnimationFrame(animate);

    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    state.simAccumDt += dt;

    if (dt > 0) fpsAvg += ((1 / dt) - fpsAvg) * 0.05;
    if (!userForcedPerf) {
        if (fpsAvg < 42) { lowStreak++; highStreak = 0; } else { lowStreak = 0; }
        if (fpsAvg > 55) { highStreak++; } else { highStreak = 0; }
        if (!state.perfMode && lowStreak > 90) { applyPerformanceMode(true, hands); }
        else if (state.perfMode && highStreak > 180) { applyPerformanceMode(false, hands); }
    }
    if (debugEl.style.display === 'block') {
        debugEl.textContent = `fps: ${fpsAvg.toFixed(0)}  perf: ${state.perfMode}  tech: ${state.currentTech}`;
    }

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

    const targetBloom = bloomStrengths[state.currentTech] || 0.5;
    const bloomBuildup = (state.currentTech === 'void' || state.currentTech === 'shrine' || state.currentTech === 'chimera') ? 0.018 : 0.04;
    bloomPass.strength += (targetBloom - bloomPass.strength) * bloomBuildup;

    setShaderTime(now * 0.001);
    starField.rotation.y += 0.0003;
    composer.render();
}
requestAnimationFrame(animate);
