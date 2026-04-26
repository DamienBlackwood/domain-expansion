const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);

export const audioBank = {};

export function loadAudio(name, url) {
    audioBank[name] = {
        buffer: null, source: null, gain: null,
        lastPlayAt: 0, startedAtCtx: 0, offsetAtStart: 0,
        pauseOffset: 0, pausedAt: 0, isLoop: false,
    };
    fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
        .then(buf => audioCtx.decodeAudioData(buf))
        .then(dec => { audioBank[name].buffer = dec; })
        .catch(e => console.warn(`${name} audio:`, e));
}

export async function loadAudioFirst(name, urls) {
    audioBank[name] = {
        buffer: null, source: null, gain: null,
        lastPlayAt: 0, startedAtCtx: 0, offsetAtStart: 0,
        pauseOffset: 0, pausedAt: 0, isLoop: false,
    };
    for (const url of urls) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const buf = await res.arrayBuffer();
            const dec = await audioCtx.decodeAudioData(buf);
            audioBank[name].buffer = dec;
            return;
        } catch (_) {}
    }
    console.warn(`${name} audio: no usable source`, urls);
}

export function playAudio(name, opts = {}) {
    const { loop = false, gain = 0.7, fadeInMs = 220, cooldownMs = 0, resumeWindowMs = 0 } = opts;
    const b = audioBank[name]; if (!b?.buffer || b.source) return;
    const nowMs = performance.now();
    let startOffset = 0;
    if (b.pauseOffset > 0 && resumeWindowMs > 0 && nowMs - b.pausedAt <= resumeWindowMs) {
        startOffset = b.pauseOffset;
    } else {
        b.pauseOffset = 0;
        b.pausedAt = 0;
    }
    if (cooldownMs > 0 && startOffset === 0 && nowMs - b.lastPlayAt < cooldownMs) return;
    b.lastPlayAt = nowMs;

    audioCtx.resume().then(() => {
        const bufferDuration = Math.max(0.001, b.buffer.duration || 0.001);
        const safeOffset = loop
            ? (startOffset % bufferDuration)
            : Math.max(0, Math.min(bufferDuration - 0.001, startOffset));
        b.gain = audioCtx.createGain();
        b.gain.gain.setValueAtTime(0, audioCtx.currentTime);
        b.gain.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + (fadeInMs / 1000));
        b.gain.connect(masterGain);
        const src = audioCtx.createBufferSource();
        src.buffer = b.buffer;
        src.loop = loop;
        src.connect(b.gain);
        src.onended = () => {
            if (b.source === src) {
                src.disconnect();
                b.source = null;
                if (b.gain) { b.gain.disconnect(); b.gain = null; }
                b.pauseOffset = 0;
                b.pausedAt = 0;
            }
        };
        b.source = src;
        b.isLoop = loop;
        b.offsetAtStart = safeOffset;
        b.startedAtCtx = audioCtx.currentTime;
        src.start(0, safeOffset);
    });
}

export function stopAudio(name, opts = {}) {
    const { immediate = false, pause = false } = opts;
    const b = audioBank[name]; if (!b?.source) return;
    const nowMs = performance.now();
    const elapsed = Math.max(0, audioCtx.currentTime - b.startedAtCtx);
    const rawOffset = b.offsetAtStart + elapsed;
    const duration = Math.max(0.001, b.buffer?.duration || 0.001);
    if (pause) {
        b.pauseOffset = b.isLoop
            ? (rawOffset % duration)
            : Math.max(0, Math.min(duration - 0.001, rawOffset));
        b.pausedAt = nowMs;
    } else {
        b.pauseOffset = 0;
        b.pausedAt = 0;
    }
    const src = b.source;
    const gn = b.gain;
    src.onended = null;
    if (immediate) {
        try { src.stop(); } catch (_) {}
        src.disconnect();
        if (gn) gn.disconnect();
        b.source = null;
        b.gain = null;
        return;
    }
    gn.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.12);
    setTimeout(() => { try { src.stop() } catch (_) {} src.disconnect(); if (gn) gn.disconnect(); }, 160);
    b.source = null; b.gain = null;
}

function sfxUrl(file) {
    return new URL(`../../sfx/${file}`, import.meta.url).href;
}

// load sound files
loadAudioFirst('void', [
    sfxUrl('gojos-domain.opus'),
]);
loadAudioFirst('shrine', [
    sfxUrl('sukunas-domain.opus'),
]);
