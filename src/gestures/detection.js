import { clamp01, smoothstep } from '../utils.js';

const WRIST = 0;
const THUMB_TIP = 4, THUMB_IP = 3, THUMB_MCP = 2;
const FINGER = {
    index:  { tip: 8,  pip: 6,  mcp: 5  },
    middle: { tip: 12, pip: 10, mcp: 9  },
    ring:   { tip: 16, pip: 14, mcp: 13 },
    pinky:  { tip: 20, pip: 18, mcp: 17 },
};

export function landmarkDist(a, ai, b, bi) {
    return Math.hypot(a[ai].x - b[bi].x, a[ai].y - b[bi].y);
}

export function landmarkDist3(a, ai, b, bi) {
    const dx = a[ai].x - b[bi].x;
    const dy = a[ai].y - b[bi].y;
    const dz = (a[ai].z || 0) - (b[bi].z || 0);
    return Math.hypot(dx, dy, dz);
}

function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }; }
function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function len(a) { return Math.hypot(a.x, a.y, a.z); }
function norm(a) { const l = len(a) + 1e-9; return { x: a.x / l, y: a.y / l, z: a.z / l }; }

export function normalizeHand(lm) {
    const wrist = lm[WRIST];
    const idxMcp = lm[FINGER.index.mcp];
    const pinkyMcp = lm[FINGER.pinky.mcp];
    const midMcp = lm[FINGER.middle.mcp];

    const up = norm(sub(midMcp, wrist));
    const acrossRaw = sub(pinkyMcp, idxMcp);
    let normal = norm(cross(up, acrossRaw));
    const side = norm(cross(normal, up));
    normal = cross(side, up);

    const scale = (landmarkDist3(lm, FINGER.index.mcp, lm, FINGER.pinky.mcp)
                 + landmarkDist3(lm, WRIST, lm, FINGER.middle.mcp)) * 0.5 + 1e-6;

    const local = new Array(21);
    for (let i = 0; i < 21; i++) {
        const r = sub(lm[i], wrist);
        local[i] = {
            x: dot(r, side) / scale,
            y: dot(r, up) / scale,
            z: dot(r, normal) / scale,
        };
    }
    return { local, scale, up, side, normal };
}

function fingerExtension(local, f) {
    return local[f.tip].y - local[f.mcp].y;
}

function fingerStraight(local, f) {
    const tip = local[f.tip], pip = local[f.pip], mcp = local[f.mcp];
    const reach = tip.y - mcp.y;
    const lateral = Math.abs(tip.x - mcp.x) + Math.abs(tip.z - mcp.z);
    const pipForward = pip.y - mcp.y;
    if (reach < 0.15) return 0;
    const collinear = clamp01(1 - lateral / (Math.abs(reach) + 0.2));
    const pipOk = clamp01(pipForward / (reach * 0.5 + 0.1));
    return collinear * pipOk;
}

export function handFeatures(lm) {
    const { local } = normalizeHand(lm);

    const ext = {
        index:  fingerExtension(local, FINGER.index),
        middle: fingerExtension(local, FINGER.middle),
        ring:   fingerExtension(local, FINGER.ring),
        pinky:  fingerExtension(local, FINGER.pinky),
    };
    const straight = {
        index:  fingerStraight(local, FINGER.index),
        middle: fingerStraight(local, FINGER.middle),
        ring:   fingerStraight(local, FINGER.ring),
        pinky:  fingerStraight(local, FINGER.pinky),
    };

    const up = {
        index:  smoothstep(0.55, 0.95, ext.index)  * (0.4 + 0.6 * straight.index),
        middle: smoothstep(0.55, 0.95, ext.middle) * (0.4 + 0.6 * straight.middle),
        ring:   smoothstep(0.5,  0.9,  ext.ring)   * (0.4 + 0.6 * straight.ring),
        pinky:  smoothstep(0.45, 0.85, ext.pinky)  * (0.4 + 0.6 * straight.pinky),
    };
    const curl = {
        index:  1 - smoothstep(0.35, 0.7, ext.index),
        middle: 1 - smoothstep(0.35, 0.7, ext.middle),
        ring:   1 - smoothstep(0.35, 0.7, ext.ring),
        pinky:  1 - smoothstep(0.35, 0.7, ext.pinky),
    };

    const thumbTip = local[THUMB_TIP];
    const thumbReach = Math.hypot(thumbTip.x, thumbTip.y);
    const thumbOut = smoothstep(0.55, 0.95, thumbReach);
    const thumbTuck = 1 - thumbOut;

    const pinchGap = Math.hypot(
        thumbTip.x - local[FINGER.index.tip].x,
        thumbTip.y - local[FINGER.index.tip].y,
        thumbTip.z - local[FINGER.index.tip].z,
    );

    const idxMidGap = Math.hypot(
        local[FINGER.index.tip].x - local[FINGER.middle.tip].x,
        local[FINGER.index.tip].y - local[FINGER.middle.tip].y,
    );

    return { local, ext, straight, up, curl, thumbOut, thumbTuck, pinchGap, idxMidGap };
}

function scoreFist(f) {
    const allCurled = (f.curl.index + f.curl.middle + f.curl.ring + f.curl.pinky) / 4;
    const notPinch = smoothstep(0.25, 0.45, f.pinchGap);
    return allCurled * (0.5 + 0.5 * f.thumbTuck) * (0.4 + 0.6 * notPinch);
}

function scorePinch(f) {
    const close = 1 - smoothstep(0.18, 0.34, f.pinchGap);
    const notFist = smoothstep(0.4, 0.7, (f.ext.index + f.ext.middle) * 0.5);
    return close * (0.4 + 0.6 * notFist);
}

function scoreRed(f) {
    const indexUp = f.up.index;
    const ringPinkyDown = (f.curl.ring + f.curl.pinky) / 2;
    const thumb = f.thumbOut;
    return indexUp * ringPinkyDown * (0.45 + 0.55 * thumb);
}

function scoreVoid(f) {
    const indexUp = f.up.index;
    const middleNotFree = 1 - smoothstep(0.35, 0.7, f.idxMidGap);
    const ringPinkyDown = (f.curl.ring + f.curl.pinky) / 2;
    return indexUp * middleNotFree * ringPinkyDown;
}

function scoreOpen(f) {
    return (f.up.index + f.up.middle + f.up.ring + f.up.pinky) / 4 * (0.4 + 0.6 * f.thumbOut);
}

const GESTURE_FLOOR = 0.42;

export function getHandGesture(lm) {
    return getHandGestureFromFeatures(handFeatures(lm));
}

export function getHandGestureFromFeatures(f) {
    const scores = {
        void:   scoreVoid(f),
        red:    scoreRed(f),
        purple: scorePinch(f),
        blue:   scoreFist(f),
        open:   scoreOpen(f),
    };

    let best = 'open';
    let bestScore = scores.open;
    for (const k of ['void', 'red', 'purple', 'blue']) {
        if (scores[k] > bestScore && scores[k] >= GESTURE_FLOOR) {
            best = k;
            bestScore = scores[k];
        }
    }

    return best;
}

function pairScale(handA, handB) {
    return ((landmarkDist3(handA, 0, handA, 9) + landmarkDist3(handB, 0, handB, 9)) * 0.5) + 1e-6;
}

// The old shape term averaged four absolute reach thresholds, which handed a plain fist half
// the average for free — a fist scored 0.500 against a 0.50 gate. What actually separates the
// mudra is how far middle+ring out-reach index+pinky: 0.91 for the mudra, 0.19 for an open
// hand, 0.03 for a fist, negative for the chimera sign. Score that gap directly.
export function sukunaShape(f) {
    const pairExt = (f.ext.middle + f.ext.ring) * 0.5;
    const foldExt = (f.ext.index + f.ext.pinky) * 0.5;
    const spread = smoothstep(0.22, 0.55, pairExt - foldExt);
    const folded = (f.curl.index + f.curl.pinky) * 0.5;
    // fingerStraight tops out near 0.6 even for a locked-straight finger, so keep its weight
    // low — otherwise it caps the whole score and drags z-noise in with it
    const straight = (f.straight.middle + f.straight.ring) * 0.5;
    return spread * (0.35 + 0.65 * folded) * (0.7 + 0.3 * straight);
}

export const SUKUNA_ENTER = 0.45;

export function evaluateSukunaMudra(left, right) {
    return evaluateSukunaMudraFromFeatures(left, right, handFeatures(left), handFeatures(right));
}

export function evaluateSukunaMudraFromFeatures(left, right, lf, rf) {
    const scale = pairScale(left, right);

    const middleGap = landmarkDist3(left, FINGER.middle.tip, right, FINGER.middle.tip) / scale;
    const ringGap   = landmarkDist3(left, FINGER.ring.tip,   right, FINGER.ring.tip)   / scale;
    const wristGap  = landmarkDist3(left, WRIST, right, WRIST) / scale;
    const wristYGap = Math.abs(left[WRIST].y - right[WRIST].y) / scale;

    const shapeL = sukunaShape(lf);
    const shapeR = sukunaShape(rf);
    const shape = (shapeL + shapeR) * 0.5;

    const tipGap = (middleGap + ringGap) * 0.5;
    const tipsTouching = 1 - smoothstep(0.45, 1.05, tipGap);
    const wristsClose = 1 - smoothstep(1.6, 2.6, wristGap);
    const wristAligned = 1 - smoothstep(0.7, 1.6, wristYGap);
    const join = tipsTouching * (0.55 + 0.45 * wristsClose) * (0.75 + 0.25 * wristAligned);

    const score = shape * join;

    return {
        matched: score >= SUKUNA_ENTER,
        score, shape, join, shapeL, shapeR,
        tipsTouching, wristsClose, wristAligned,
        strongMudraShape: shape >= 0.45,
        handsJoinedForCast: join >= 0.35,
        distinctHands: true,
        wristGap, middleGap, ringGap, wristYGap, tipGap,
    };
}

export function evaluateChimeraMudra(left, right) {
    return evaluateChimeraMudraFromFeatures(left, right, handFeatures(left), handFeatures(right));
}

export function evaluateChimeraMudraFromFeatures(left, right, lf, rf) {
    const scale = pairScale(left, right);

    const indexUp = (lf.up.index + rf.up.index) * 0.5;
    const midDown = (lf.curl.middle + rf.curl.middle) * 0.5;
    const ringDown = (lf.curl.ring + rf.curl.ring) * 0.5;
    const pinkyDown = (lf.curl.pinky + rf.curl.pinky) * 0.5;
    const thumbTuck = (lf.thumbTuck + rf.thumbTuck) * 0.5;

    const shrineShape = sukunaShape(lf) > 0.45 || sukunaShape(rf) > 0.45;
    if (shrineShape) {
        return { matched: false, handsJoinedForCast: false, distinctHands: true, wristGap: 999 };
    }

    const indexTipGap = landmarkDist3(left, FINGER.index.tip, right, FINGER.index.tip) / scale;
    const palmGap = landmarkDist3(left, FINGER.middle.mcp, right, FINGER.middle.mcp) / scale;
    const wristGap = landmarkDist3(left, WRIST, right, WRIST) / scale;

    const indexTouching = indexTipGap < 0.55;
    const palmsClose = palmGap < 0.80;
    const wristsReaching = wristGap < 1.20;
    const handsJoinedForCast = indexTouching && palmsClose && wristsReaching;

    const shapeScore = (indexUp + midDown + ringDown + pinkyDown + thumbTuck) / 5;
    const strongMudraShape = shapeScore >= 0.55;

    return {
        matched: handsJoinedForCast && strongMudraShape,
        handsJoinedForCast,
        distinctHands: true,
        wristGap,
    };
}

