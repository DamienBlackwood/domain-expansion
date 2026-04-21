import { renderer } from '../engine/scene.js';
import { state } from '../state.js';

export function createPerfBadge() {
    const perfBadge = document.createElement('div');
    perfBadge.id = 'perf-badge';
    perfBadge.textContent = 'TEST MODE';
    perfBadge.style.cssText = [
        'position:fixed', 'top:16px', 'right:16px', 'z-index:35',
        'padding:6px 10px',
        "font:700 11px/1 'Inter', sans-serif",
        'letter-spacing:2px', 'text-transform:uppercase',
        'color:rgba(120,200,180,0.9)', 'background:rgba(12,16,20,0.72)',
        'border:1px solid rgba(120,200,180,0.2)',
        'border-radius:4px', 'backdrop-filter:blur(4px)',
        'display:none',
    ].join(';');
    document.body.appendChild(perfBadge);
    return perfBadge;
}

export function createTuneHud() {
    const tuneHud = document.createElement('div');
    tuneHud.id = 'tune-hud';
    tuneHud.style.cssText = [
        'position:fixed', 'top:52px', 'right:16px', 'z-index:36',
        'min-width:260px', 'padding:10px 12px',
        "font:600 11px/1.35 'Inter', sans-serif",
        'letter-spacing:0.4px', 'color:rgba(120,200,180,0.85)',
        'background:rgba(12,16,20,0.78)',
        'border:1px solid rgba(120,200,180,0.12)',
        'border-radius:6px', 'backdrop-filter:blur(6px)',
        'white-space:pre', 'display:none',
    ].join(';');
    document.body.appendChild(tuneHud);
    return tuneHud;
}

export function applyPerformanceMode(enabled, hands) {
    state.perfMode = enabled;
    const pixelRatioCap = enabled ? 0.95 : 2;
    renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatioCap));
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: enabled ? 0 : 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.35,
    });
    state.perfBadge.style.display = enabled ? 'block' : 'none';
}
