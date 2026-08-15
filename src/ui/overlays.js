import { applyPixelRatio } from '../engine/scene.js';
import { state } from '../state.js';

// DOM refs live here since this module creates them — other modules import the live binding
export let perfBadge = null;
export let tuneHud = null;

export function createPerfBadge() {
    const el = document.createElement('div');
    el.id = 'perf-badge';
    el.textContent = 'TEST MODE';
    el.style.cssText = [
        'position:fixed', 'top:16px', 'right:16px', 'z-index:35',
        'padding:6px 10px',
        "font:700 11px/1 'Inter', sans-serif",
        'letter-spacing:2px', 'text-transform:uppercase',
        'color:rgba(120,200,180,0.9)', 'background:rgba(12,16,20,0.72)',
        'border:1px solid rgba(120,200,180,0.2)',
        'border-radius:4px', 'backdrop-filter:blur(4px)',
        'display:none',
    ].join(';');
    document.body.appendChild(el);
    perfBadge = el;
    return el;
}

export function createTuneHud() {
    const el = document.createElement('div');
    el.id = 'tune-hud';
    el.style.cssText = [
        'position:fixed', 'top:52px', 'right:16px', 'z-index:36',
        'min-width:260px', 'padding:10px 12px',
        "font:600 11px/1.35 'Inter', sans-serif",
        'letter-spacing:0.4px', 'color:rgba(120,200,180,0.85)',
        'background:rgba(12,16,20,0.78)',
        'border:1px solid rgba(120,200,180,0.12)',
        'border-radius:6px', 'backdrop-filter:blur(6px)',
        'white-space:pre', 'display:none',
    ].join(';');
    document.body.appendChild(el);
    tuneHud = el;
    return el;
}

export function applyPerformanceMode(enabled, hands) {
    state.perfMode = enabled;
    applyPixelRatio(enabled);
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: enabled ? 0 : 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.35,
    });
    perfBadge.style.display = enabled ? 'block' : 'none';
}
