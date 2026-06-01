// palm-local coordinate frame → orientation/scale-free gesture scores.
// raw screen-y checks + wrist ratios used to flicker badly when you tilted your hand.

// landmark indices
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

// vec3 helpers — plain objects, no allocs in hot path
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

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smoothstep(edge0, edge1, x) {
    const t = clamp01((x - edge0) / (edge1 - edge0 + 1e-9));
    return t * t * (3 - 2 * t);
}

// palm-local frame — y toward fingers, x across palm, z normal
export function normalizeHand(lm) {
    const wrist = lm[WRIST];
    const idxMcp = lm[FINGER.index.mcp];
    const pinkyMcp = lm[FINGER.pinky.mcp];
    const midMcp = lm[FINGER.middle.mcp];

    const up = norm(sub(midMcp, wrist));
    const acrossRaw = sub(pinkyMcp, idxMcp);
    let normal = norm(cross(up, acrossRaw));
    const side = norm(cross(normal, up));
    // re-orthogonalise normal so the frame is clean
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

// tip y past mcp y — 0 = curled, 1+ = extended
function fingerExtension(local, f) {
    return local[f.tip].y - local[f.mcp].y;
}

// 0..1 — tip/pip/mcp collinear along up axis (1 = dead straight)
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

    // per-finger "up" confidence — extended AND straight
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

    // thumb: distance tip->index-mcp side, and tuck across palm
    const thumbTip = local[THUMB_TIP];
    const thumbReach = Math.hypot(thumbTip.x, thumbTip.y);
    const thumbOut = smoothstep(0.55, 0.95, thumbReach);
    const thumbTuck = 1 - thumbOut;

    // pinch — thumb tip to index tip, in palm units
    const pinchGap = Math.hypot(
        thumbTip.x - local[FINGER.index.tip].x,
        thumbTip.y - local[FINGER.index.tip].y,
        thumbTip.z - local[FINGER.index.tip].z,
    );

    // index/middle proximity — for the void crossed-finger pose
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

// finger gun: index up, thumb out, ring+pinky curled
function scoreRed(f) {
    const indexUp = f.up.index;
    const ringPinkyDown = (f.curl.ring + f.curl.pinky) / 2;
    const thumb = f.thumbOut;
    // middle may be up or tucked alongside index, don't penalise either way
    return indexUp * ringPinkyDown * (0.45 + 0.55 * thumb);
}

// Gojo's sign: index up, middle hugging index, ring+pinky down
function scoreVoid(f) {
    const indexUp = f.up.index;
    const middleNotFree = 1 - smoothstep(0.35, 0.7, f.idxMidGap); // middle hugs index
    const ringPinkyDown = (f.curl.ring + f.curl.pinky) / 2;
    return indexUp * middleNotFree * ringPinkyDown;
}

function scoreOpen(f) {
    return (f.up.index + f.up.middle + f.up.ring + f.up.pinky) / 4 * (0.4 + 0.6 * f.thumbOut);
}

const GESTURE_FLOOR = 0.42;

export function getHandGesture(lm) {
    const f = handFeatures(lm);
    const scores = {
        void:   scoreVoid(f),
        red:    scoreRed(f),
        purple: scorePinch(f),
        blue:   scoreFist(f),
        open:   scoreOpen(f),
    };

    let best = 'open';
    let bestScore = scores.open;
    // void and red share index-up geometry; bias toward whichever scores higher,
    // but require a clear margin so they don't trade blows frame to frame
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

// Sukuna: clasped hands, middle+ring up and touching, index+pinky folded.
// MediaPipe blends interlaced hands so we score fuzzily.
export function evaluateSukunaMudra(left, right) {
    const scale = pairScale(left, right);
    const lf = handFeatures(left);
    const rf = handFeatures(right);

    const middleUp = (lf.up.middle + rf.up.middle) * 0.5;
    const ringUp   = (lf.up.ring   + rf.up.ring)   * 0.5;
    const indexDown = (lf.curl.index + rf.curl.index) * 0.5;
    const pinkyDown = (lf.curl.pinky + rf.curl.pinky) * 0.5;

    const middleGap = landmarkDist3(left, FINGER.middle.tip, right, FINGER.middle.tip) / scale;
    const ringGap   = landmarkDist3(left, FINGER.ring.tip,   right, FINGER.ring.tip)   / scale;
    const wristGap  = landmarkDist3(left, WRIST, right, WRIST) / scale;
    const wristYGap = Math.abs(left[WRIST].y - right[WRIST].y);

    const tipsTouching = middleGap < 0.6 && ringGap < 0.6;
    const handsJoinedForCast = tipsTouching && wristGap < 1.8;
    const wristAligned = wristYGap < 0.6;

    const shapeScore = (middleUp + ringUp + indexDown + pinkyDown) / 4;
    const strongMudraShape = shapeScore >= 0.5;

    if (!handsJoinedForCast || !strongMudraShape) {
        return mudraResult(false, 0, { strongMudraShape, handsJoinedForCast, wristGap, middleGap, ringGap, wristYGap, wristAligned, tipsTouching });
    }

    let score = 3;
    if (middleGap < 0.3) score++;
    if (wristAligned) score++;
    return mudraResult(true, score, { strongMudraShape, handsJoinedForCast, wristGap, middleGap, ringGap, wristYGap, wristAligned, tipsTouching, totalFolded: 4 });
}

// Chimera: clasped hands, both index tips meeting, everything else folded.
// Rejects if it looks like shrine (middle+ring up on either hand).
export function evaluateChimeraMudra(left, right) {
    const scale = pairScale(left, right);
    const lf = handFeatures(left);
    const rf = handFeatures(right);

    const indexUp = (lf.up.index + rf.up.index) * 0.5;
    const midDown = (lf.curl.middle + rf.curl.middle) * 0.5;
    const ringDown = (lf.curl.ring + rf.curl.ring) * 0.5;
    const pinkyDown = (lf.curl.pinky + rf.curl.pinky) * 0.5;
    const thumbTuck = (lf.thumbTuck + rf.thumbTuck) * 0.5;

    // shrine shape = middle+ring extended on either hand → reject
    const shrineShape = (lf.up.middle > 0.5 || rf.up.middle > 0.5) && (lf.up.ring > 0.5 || rf.up.ring > 0.5);
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

// wide result shape that hands.js + tune HUD both expect
function mudraResult(matched, score, m) {
    return {
        matched, score, targetScore: 3,
        strongMudraShape: m.strongMudraShape,
        handsJoinedForCast: m.handsJoinedForCast,
        distinctHands: true,
        wristGap: m.wristGap, middleGap: m.middleGap, ringGap: m.ringGap,
        wristYGap: m.wristYGap, wristAligned: m.wristAligned,
        wristsNearby: m.tipsTouching, wristsCrossLinked: false,
        palmGap: 0, indexGap: 0, thumbGap: 0,
        joinedSignals: Number(m.tipsTouching),
        requiredJoinedSignals: 1, wideWristGap: false, extraScoreRequirement: 0,
        bothHandsOpen: false, totalFoldedNonIndex: m.totalFolded || 0,
    };
}
