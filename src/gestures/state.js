import { clamp01 } from '../utils.js';
import { updateState } from '../ui/theme.js';

export const gestureKeys = ['red', 'blue', 'purple', 'void'];
export const gestureConfig = {
    red:    { enter: 0.68, hold: 0.36, rise: 0.26, fall: 0.14, cooldown: 260 },
    blue:   { enter: 0.68, hold: 0.36, rise: 0.26, fall: 0.14, cooldown: 260 },
    purple: { enter: 0.66, hold: 0.34, rise: 0.24, fall: 0.12, cooldown: 280 },
    void:   { enter: 0.62, hold: 0.33, rise: 0.28, fall: 0.16, cooldown: 380 },
};
export const gestureConfidence = { red: 0, blue: 0, purple: 0, void: 0 };
export const gestureCooldownUntil = { red: 0, blue: 0, purple: 0, void: 0 };
export let activeGesture = 'neutral';
export let devOverride = false;

export function setActiveGesture(g) { activeGesture = g; }
export function setDevOverride(v) { devOverride = v; }

// hand-tracking counters — written by hands.js, decayed/consumed by app.js's render loop
export const gestureTrack = { handDrawTick: 0, trackTargetX: 0, trackSeenFrames: 0 };
export let tuneHudEnabled = false;
export function setTuneHudEnabled(v) { tuneHudEnabled = v; }

export function stepGestureState(rawGesture, nowMs) {
    if (devOverride) return;
    if (rawGesture === 'shrine' || rawGesture === 'chimera') {
        if (activeGesture !== rawGesture) {
            for (const key of gestureKeys) gestureConfidence[key] = 0;
        }
        activeGesture = rawGesture;
        updateState(activeGesture);
        return;
    }

    if ((activeGesture === 'shrine' || activeGesture === 'chimera') && rawGesture !== activeGesture) {
        activeGesture = 'neutral';
        updateState(activeGesture);
        return;
    }

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
