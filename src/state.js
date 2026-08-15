// render/technique state genuinely shared across modules (app.js drives it,
// theme.js resets it on tech switch, hands.js cross-reads glowColor/perfMode/currentTech).
// gesture-tracking counters live in gestures/state.js; DOM refs live in ui/overlays.js.
export const state = {
    currentTech: 'neutral',
    techTime: 0,
    lerpRate: 0.1,
    shakeDecay: 0,
    shakeTime: 0,
    glowColor: 'rgba(120, 200, 180, 1)',
    perfMode: false,
};
