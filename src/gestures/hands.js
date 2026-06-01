import { landmarkDist3 } from './detection.js';
import { getHandGesture, evaluateSukunaMudra, evaluateChimeraMudra } from './detection.js';
import { gestureConfidence, activeGesture, setActiveGesture, stepGestureState } from './state.js';
import { triggerRelease } from '../techniques/release.js';
import { playAudio, stopAudio, audioBank } from '../audio/audio.js';
import { state } from '../state.js';

const VOID_STICKY = 8;
const SHRINE_STICKY = 45;
const CHIMERA_STICKY = 45;
const TWO_HAND_MUDRA_ARM_FRAMES = 2;
const TWO_HAND_TRACK_GRACE = 12;
const MUDRA_UNLOCK_NO_HANDS = 12;

const throwableTechs = new Set(['red', 'blue', 'purple']);

let lastPalm = null;
let lastReleaseAt = 0;
let releaseCharge = 0;
let voidStickyFrames = 0;
let shrineStickyFrames = 0;
let chimeraStickyFrames = 0;
let twoHandModeFrames = 0;
let twoHandLostFrames = 999;
let mudraOnlyMode = false;
let noHandsFrames = 0;
let lastMudraMetrics = null;

const trackedHands = { left: null, right: null };

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
            if (c00 <= c01) { left = h0; right = h1; }
            else { left = h1; right = h0; }
        } else {
            const sorted = [...candidates].sort((a, b) => a.lm[0].x - b.lm[0].x);
            left = sorted[0];
            right = sorted[1];
        }
    }

    trackedHands.left = { x: left.lm[0].x, y: left.lm[0].y };
    trackedHands.right = { x: right.lm[0].x, y: right.lm[0].y };

    return {
        left: left.lm, right: right.lm,
        leftLabel: left.label || 'unknown', rightLabel: right.label || 'unknown',
        leftScore: left.score || 0, rightScore: right.score || 0,
    };
}

function formatHudNum(v) {
    return Number.isFinite(v) ? v.toFixed(3) : '-';
}

function renderTuneHud(frame) {
    if (!state.tuneHudEnabled) {
        state.tuneHud.style.display = 'none';
        return;
    }
    state.tuneHud.style.display = 'block';
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

    state.tuneHud.textContent = [
        `hands: ${frame.handCount} left:${frame.leftLabel} right:${frame.rightLabel}`,
        `mudraMode: ${frame.mudraOnlyMode}`,
        `raw: ${frame.rawDetected} active: ${activeGesture}`,
        `conf red:${gestureConfidence.red.toFixed(2)} blue:${gestureConfidence.blue.toFixed(2)} purple:${gestureConfidence.purple.toFixed(2)}`,
        `conf void:${gestureConfidence.void.toFixed(2)} shrine: direct`,
        mudraLines,
    ].join('\n');
}

export function setupHands(video, canvas) {
    const ctx = canvas.getContext('2d');
    const sukunaGuide = document.getElementById('sukuna-guide');

    const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.35 });

    hands.onResults(results => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let detected = 'neutral';
        let voidPoseHeld = false;
        let shrinePoseHeld = false;
        let chimeraPoseHeld = false;
        const nowMs = performance.now();
        const handCount = results.multiHandLandmarks?.length || 0;
        const frameHud = {
            handCount, leftLabel: '-', rightLabel: '-',
            rawDetected: 'neutral', mudra: null, mudraOnlyMode,
        };
        if (handCount > 0) noHandsFrames = 0;
        else noHandsFrames++;
        if (handCount < 2) {
            shrineStickyFrames = Math.max(0, shrineStickyFrames - 1);
            chimeraStickyFrames = Math.max(0, chimeraStickyFrames - 1);
            twoHandLostFrames++;
        }
        if (noHandsFrames >= MUDRA_UNLOCK_NO_HANDS) mudraOnlyMode = false;
        frameHud.mudraOnlyMode = mudraOnlyMode;

        if (handCount > 0) {
            const drawHandsNow = !state.perfMode || ((state.handDrawTick++ % 2) === 0);
            if (drawHandsNow) {
                const lineWidth = state.perfMode ? 2 : 4;
                const dotRadius = state.perfMode ? 1.2 : 2;
                results.multiHandLandmarks.forEach(lm => {
                    drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: state.glowColor, lineWidth });
                    drawLandmarks(ctx, lm, { color: '#fff', lineWidth: 1, radius: dotRadius });
                });
            }

            if (handCount >= 2) {
                const pair = resolveTwoHandPair(results) || {
                    left: results.multiHandLandmarks[0],
                    right: results.multiHandLandmarks[1],
                    leftLabel: 'unknown', rightLabel: 'unknown',
                    leftScore: 0, rightScore: 0,
                };
                const a = pair.left;
                const b = pair.right;
                frameHud.leftLabel = pair.leftLabel;
                frameHud.rightLabel = pair.rightLabel;
                const mudra = evaluateSukunaMudra(a, b);
                const chimeraMudra = evaluateChimeraMudra(a, b);
                const leftGesture = getHandGesture(a);
                const rightGesture = getHandGesture(b);
                const voidPair = leftGesture === 'void' || rightGesture === 'void';
                const knownLeft = pair.leftLabel === 'left' || pair.leftLabel === 'right';
                const knownRight = pair.rightLabel === 'left' || pair.rightLabel === 'right';
                const sameHighConfidenceLabel =
                    knownLeft && knownRight &&
                    pair.leftLabel === pair.rightLabel &&
                    pair.leftScore >= 0.78 && pair.rightScore >= 0.78;
                const reallyTwoHands = mudra.wristGap > 0.35 || chimeraMudra.wristGap > 0.35;
                const reliableTwoHandPair =
                    reallyTwoHands && (mudra.handsJoinedForCast || chimeraMudra.handsJoinedForCast || (mudra.distinctHands && !sameHighConfidenceLabel));
                lastMudraMetrics = mudra;
                frameHud.mudra = mudra;
                lastPalm = null;
                releaseCharge = 0;
                state.trackSeenFrames = 0;
                voidStickyFrames = 0;
                if (!reliableTwoHandPair || voidPair) {
                    mudraOnlyMode = false;
                    twoHandLostFrames++;
                    twoHandModeFrames = 0;
                    shrineStickyFrames = 0;
                    chimeraStickyFrames = 0;
                    detected = 'neutral';
                    sukunaGuide.classList.remove('two-hands', 'matched');
                } else {
                    twoHandLostFrames = 0;
                    mudraOnlyMode = true;
                    sukunaGuide.classList.add('two-hands');
                    twoHandModeFrames++;
                    detected = 'neutral';

                    if (mudra.matched) {
                        shrineStickyFrames = SHRINE_STICKY;
                        chimeraStickyFrames = 0;
                        detected = 'shrine';
                        sukunaGuide.classList.add('matched');
                    } else if (shrineStickyFrames > 0) {
                        detected = 'shrine';
                        sukunaGuide.classList.add('matched');
                    } else if (chimeraMudra.matched) {
                        chimeraStickyFrames = CHIMERA_STICKY;
                        detected = 'chimera';
                        sukunaGuide.classList.add('matched');
                    } else if (chimeraStickyFrames > 0) {
                        detected = 'chimera';
                        sukunaGuide.classList.add('matched');
                    } else {
                        sukunaGuide.classList.remove('matched');
                    }
                }
                voidPoseHeld = detected === 'void';
                shrinePoseHeld = detected === 'shrine';
                chimeraPoseHeld = detected === 'chimera';
            } else {
                if (mudraOnlyMode) {
                    frameHud.mudra = lastMudraMetrics;
                    sukunaGuide.classList.add('two-hands');
                    sukunaGuide.classList.remove('matched');
                    const lm = results.multiHandLandmarks[0];
                    const gesture = getHandGesture(lm);
                    if (gesture === 'void') {
                        voidStickyFrames = VOID_STICKY;
                        detected = 'void';
                        voidPoseHeld = true;
                    } else if (voidStickyFrames > 0 && state.currentTech === 'void' && gesture === 'open') {
                        voidStickyFrames--;
                        detected = 'void';
                        voidPoseHeld = true;
                    } else {
                        voidStickyFrames = Math.max(0, voidStickyFrames - 1);
                        detected = 'neutral';
                    }
                    lastPalm = null;
                    releaseCharge = 0;
                    state.trackSeenFrames = 0;
                } else {
                    const keepTwoHandMode = twoHandModeFrames > 0 && twoHandLostFrames <= TWO_HAND_TRACK_GRACE;
                    if (keepTwoHandMode) {
                        frameHud.mudra = lastMudraMetrics;
                        sukunaGuide.classList.add('two-hands');
                        sukunaGuide.classList.remove('matched');
                        detected = 'neutral';
                        lastPalm = null;
                        releaseCharge = 0;
                        state.trackSeenFrames = 0;
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

                        const positionTrackActive = state.currentTech === 'red' || state.currentTech === 'blue';
                        if (positionTrackActive) {
                            state.trackTargetX = Math.max(-1, Math.min(1, (0.5 - palm.x) * 2.0));
                            state.trackSeenFrames = 12;
                        } else {
                            state.trackTargetX = 0;
                            state.trackSeenFrames = 0;
                        }

                        if (throwableTechs.has(state.currentTech) && gesture !== 'open') {
                            releaseCharge = Math.min(1, releaseCharge + 0.22);
                        } else {
                            releaseCharge = Math.max(0, releaseCharge - 0.08);
                        }

                        const canRelease =
                            state.currentTech !== 'neutral' &&
                            throwableTechs.has(state.currentTech) &&
                            gesture === 'open' &&
                            releaseCharge > 0.48 &&
                            speed > 0.009 &&
                            nowMs - lastReleaseAt > 420;
                        if (canRelease) {
                            triggerRelease(state.currentTech, palmVelX, palmVelY);
                            lastReleaseAt = nowMs;
                            releaseCharge = 0;
                        }

                        if (gesture === 'void') {
                            voidStickyFrames = VOID_STICKY;
                            detected = 'void';
                        } else if (voidStickyFrames > 0 && state.currentTech === 'void' && (gesture === 'red' || gesture === 'open')) {
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
            state.trackSeenFrames = Math.max(0, state.trackSeenFrames - 1);
            voidStickyFrames = Math.max(0, voidStickyFrames - 1);
        }

        if (!voidPoseHeld) stopAudio('void', { immediate: true, pause: true });
        if (!shrinePoseHeld) stopAudio('shrine', { immediate: true, pause: true });
        if (!chimeraPoseHeld) stopAudio('chimera', { immediate: true, pause: true });
        if (voidPoseHeld) {
            const b = audioBank.void;
            if (b && !b.source) {
                playAudio('void', { loop: false, cooldownMs: 800, fadeInMs: 90, gain: 0.72, resumeWindowMs: 2200 });
            }
        }
        if (shrinePoseHeld) {
            const b = audioBank.shrine;
            if (b && !b.source) {
                playAudio('shrine', { loop: false, cooldownMs: 800, fadeInMs: 80, gain: 0.86, resumeWindowMs: 2800 });
            }
        }
        if (chimeraPoseHeld) {
            const b = audioBank.chimera;
            if (b && !b.source) {
                playAudio('chimera', { loop: false, cooldownMs: 800, fadeInMs: 80, gain: 0.86, resumeWindowMs: 2800 });
            }
        }
        frameHud.rawDetected = detected;
        if (mudraOnlyMode) {
            gestureConfidence.red = 0;
            gestureConfidence.blue = 0;
            gestureConfidence.purple = 0;
            gestureConfidence.void = 0;
            if (handCount < 2 && activeGesture === 'shrine' && shrineStickyFrames <= 0) {
                setActiveGesture('neutral');
                detected = 'neutral';
            }
            if (handCount < 2 && activeGesture === 'chimera' && chimeraStickyFrames <= 0) {
                setActiveGesture('neutral');
                detected = 'neutral';
            }
            if (activeGesture !== 'neutral' && activeGesture !== 'shrine' && activeGesture !== 'chimera') setActiveGesture('neutral');
            if (detected !== 'shrine' && detected !== 'chimera') detected = 'neutral';
            frameHud.rawDetected = detected;
        }
        frameHud.mudraOnlyMode = mudraOnlyMode;
        stepGestureState(detected, nowMs);
        renderTuneHud(frameHud);
    });

    const MIN_INFER_MS = 45;
    let lastInfer = 0;
    const cam = new Camera(video, {
        onFrame: async () => {
            const now = performance.now();
            if (now - lastInfer < MIN_INFER_MS) return;
            lastInfer = now;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            await hands.send({ image: video });
        },
        width: 480, height: 360,
    });
    cam.start();

    return hands;
}
