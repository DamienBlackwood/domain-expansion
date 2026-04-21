export function landmarkDist(a, ai, b, bi) {
    return Math.hypot(a[ai].x - b[bi].x, a[ai].y - b[bi].y);
}

export function landmarkDist3(a, ai, b, bi) {
    const dx = a[ai].x - b[bi].x;
    const dy = a[ai].y - b[bi].y;
    const dz = (a[ai].z || 0) - (b[bi].z || 0);
    return Math.hypot(dx, dy, dz);
}

export function isFingerUp(lm, tip, pip, mcp) {
    return lm[tip].y < lm[pip].y && lm[pip].y < lm[mcp].y;
}

export function isFingerCurled(lm, tip, pip, mcp) {
    return lm[tip].y > lm[pip].y || lm[pip].y > lm[mcp].y;
}

export function isFingerExtended(lm, tip, pip, mcp, wrist = 0) {
    const tipReach = landmarkDist(lm, tip, lm, wrist);
    const pipReach = landmarkDist(lm, pip, lm, wrist);
    const mcpReach = landmarkDist(lm, mcp, lm, wrist);
    return tipReach > pipReach * 1.07 && tipReach > mcpReach * 1.14;
}

export function extendedCountNoThumb(lm) {
    return (
        Number(isFingerExtended(lm, 8, 6, 5)) +
        Number(isFingerExtended(lm, 12, 10, 9)) +
        Number(isFingerExtended(lm, 16, 14, 13)) +
        Number(isFingerExtended(lm, 20, 18, 17))
    );
}

export function pairScale(handA, handB) {
    return ((landmarkDist3(handA, 0, handA, 9) + landmarkDist3(handB, 0, handB, 9)) * 0.5) + 1e-6;
}

export function getHandGesture(lm) {
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

export function evaluateChimeraMudra(left, right) {
    const scale = pairScale(left, right);

    const lPalm = landmarkDist3(left,  0, left,  9) + 1e-6;
    const rPalm = landmarkDist3(right, 0, right, 9) + 1e-6;

    // index extended (tip far from MCP base)
    const lIndexRatio = landmarkDist3(left,  8, left,  5) / lPalm;
    const rIndexRatio = landmarkDist3(right, 8, right, 5) / rPalm;
    const leftIndexUp  = lIndexRatio > 0.85;
    const rightIndexUp = rIndexRatio > 0.85;

    // middle/ring/pinky curled (tip close to base)
    const lMidRatio   = landmarkDist3(left,  12, left,  9)  / lPalm;
    const rMidRatio   = landmarkDist3(right, 12, right, 9)  / rPalm;
    const lRingRatio  = landmarkDist3(left,  16, left,  13) / lPalm;
    const rRingRatio  = landmarkDist3(right, 16, right, 13) / rPalm;
    const lPinkyRatio = landmarkDist3(left,  20, left,  17) / lPalm;
    const rPinkyRatio = landmarkDist3(right, 20, right, 17) / rPalm;

    const leftMiddleCurled  = lMidRatio  < 0.75;
    const rightMiddleCurled = rMidRatio  < 0.75;
    const leftRingCurled    = lRingRatio < 0.75;
    const rightRingCurled   = rRingRatio < 0.75;
    const leftPinkyCurled   = lPinkyRatio < 0.75;
    const rightPinkyCurled  = rPinkyRatio < 0.75;

    // thumbs tucked across palm
    const lThumbRatio = landmarkDist3(left,  4, left,  2) / lPalm;
    const rThumbRatio = landmarkDist3(right, 4, right, 2) / rPalm;
    const leftThumbTucked  = lThumbRatio < 0.8;
    const rightThumbTucked = rThumbRatio < 0.8;

    // hard reject: shrine shape — middle+ring extended on either hand
    const shrineShape =
        (lMidRatio > 0.6 || rMidRatio > 0.6) &&
        (lRingRatio > 0.6 || rRingRatio > 0.6);
    if (shrineShape) return { matched: false, handsJoinedForCast: false, distinctHands: true, wristGap: 999 };

    // spatial: clasped hands with index tips near each other
    // use raw (non-normalised) distances for cross-hand gaps since scale can be misleading
    const indexTipGap = landmarkDist3(left, 8,  right, 8)  / scale;
    const palmGap     = landmarkDist3(left, 9,  right, 9)  / scale;
    const wristGap    = landmarkDist3(left, 0,  right, 0)  / scale;

    // looser thresholds — clasped hands with raised index fingers spread wrists naturally
    const indexTouching  = indexTipGap < 0.55;
    const palmsClose     = palmGap     < 0.80;
    const wristsReaching = wristGap    < 1.20;
    const handsJoinedForCast = indexTouching && palmsClose && wristsReaching;

    const fingerScore =
        Number(leftIndexUp)      + Number(rightIndexUp)      +
        Number(leftMiddleCurled) + Number(rightMiddleCurled) +
        Number(leftRingCurled)   + Number(rightRingCurled)   +
        Number(leftPinkyCurled)  + Number(rightPinkyCurled)  +
        Number(leftThumbTucked)  + Number(rightThumbTucked);

    // 6/10 — leaves room for occlusion when hands clasp
    const strongMudraShape = fingerScore >= 6;

    return {
        matched: handsJoinedForCast && strongMudraShape,
        handsJoinedForCast,
        distinctHands: true,
        wristGap,
    };
}

export function evaluateSukunaMudra(left, right) {
    const scale = pairScale(left, right);

    const lPalm = landmarkDist3(left,  0, left,  9) + 1e-6;
    const rPalm = landmarkDist3(right, 0, right, 9) + 1e-6;

    const lMidRatio  = landmarkDist3(left,  12, left,  9) / lPalm;
    const rMidRatio  = landmarkDist3(right, 12, right, 9) / rPalm;
    const lRingRatio = landmarkDist3(left,  16, left,  13) / lPalm;
    const rRingRatio = landmarkDist3(right, 16, right, 13) / rPalm;

    const lIndexRatio = landmarkDist3(left,  8,  left,  5) / lPalm;
    const rIndexRatio = landmarkDist3(right, 8,  right, 5) / rPalm;
    const lPinkyRatio = landmarkDist3(left,  20, left,  17) / lPalm;
    const rPinkyRatio = landmarkDist3(right, 20, right, 17) / rPalm;

    const leftIndexCurled  = lIndexRatio < 0.9;
    const rightIndexCurled = rIndexRatio < 0.9;
    const leftPinkyCurled  = lPinkyRatio < 0.9;
    const rightPinkyCurled = rPinkyRatio < 0.9;

    const leftMiddleUp  = lMidRatio  > 0.6;
    const rightMiddleUp = rMidRatio  > 0.6;
    const leftRingUp    = lRingRatio > 0.6;
    const rightRingUp   = rRingRatio > 0.6;

    const middleGap = landmarkDist3(left, 12, right, 12) / scale;
    const ringGap   = landmarkDist3(left, 16, right, 16) / scale;
    const wristGap  = landmarkDist3(left, 0,  right, 0)  / scale;
    const wristYGap = Math.abs(left[0].y - right[0].y);

    const tipsTouching = middleGap < 0.6 && ringGap < 0.6;
    const handsJoinedForCast = tipsTouching && wristGap < 1.8;
    const distinctHands = true; // force pass — MediaPipe blends hands when they interlace
    const wristAligned = wristYGap < 0.6;

    // fuzzy — MediaPipe drops fingers when hands interlace, so score instead of requiring all 8
    const fingerScore =
        Number(leftMiddleUp) + Number(rightMiddleUp) +
        Number(leftRingUp)   + Number(rightRingUp)   +
        Number(leftIndexCurled)  + Number(rightIndexCurled) +
        Number(leftPinkyCurled)  + Number(rightPinkyCurled);

    const strongMudraShape = fingerScore >= 4;

    const dbg = document.getElementById('debug');
    if (dbg && dbg.style.display !== 'none') {
        dbg.textContent =
            `Sukuna Debug:\n` +
            `MidGap:${middleGap.toFixed(2)} RingGap:${ringGap.toFixed(2)}\n` +
            `Fingers: ${fingerScore}/8 (Need 4)\n` +
            `Tips Touch: ${tipsTouching}\n` +
            `Mudra OK: ${strongMudraShape}`;
    }

    if (!handsJoinedForCast || !strongMudraShape) {
        return { matched: false, score: 0, targetScore: 3, strongMudraShape, handsJoinedForCast, distinctHands,
            wristGap, middleGap, ringGap, wristYGap, wristAligned,
            wristsNearby: tipsTouching, wristsCrossLinked: false,
            palmGap: 0, indexGap: 0, thumbGap: 0,
            joinedSignals: Number(tipsTouching),
            requiredJoinedSignals: 1, wideWristGap: false, extraScoreRequirement: 0,
            bothHandsOpen: false, totalFoldedNonIndex: 0,
        };
    }

    let score = 3;
    if (middleGap < 0.3) score++;
    if (wristAligned) score++;

    return {
        matched: true, score, targetScore: 3,
        strongMudraShape, handsJoinedForCast, distinctHands,
        wristGap, middleGap, ringGap, wristYGap, wristAligned,
        wristsNearby: tipsTouching, wristsCrossLinked: false,
        palmGap: 0, indexGap: 0, thumbGap: 0,
        joinedSignals: Number(tipsTouching),
        requiredJoinedSignals: 1, wideWristGap: false, extraScoreRequirement: 0,
        bothHandsOpen: false, totalFoldedNonIndex: 4,
    };
}
