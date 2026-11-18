/**
 * Los sonidos de la apertura de cofres, sintetizados con Web Audio (no son del
 * juego). Cada paso de la subida de color suena más épico que el anterior, como una
 * racha de asesinatos, y al abrirse suena un remate según la rareza.
 *
 * Los navegadores no dejan sonar nada hasta que el usuario pulsa algo: el contexto
 * se crea en el primer sonido, que siempre llega tras pulsar «Abrir».
 */

const KEY = 'pachanga.chest.sound';
let soundOn = true;
try { soundOn = localStorage.getItem(KEY) !== 'off'; } catch { /* sin almacenamiento */ }

let ac = null;
let master = null;

export const isSoundOn = () => soundOn;

export function setSoundOn(on) {
    soundOn = on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* sin almacenamiento */ }
}

function audio() {
    if (!soundOn) return null;
    try {
        if (!ac) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            ac = new Ctx();
            master = ac.createGain();
            master.gain.value = 0.5;
            master.connect(ac.destination);
        }
        if (ac.state === 'suspended') ac.resume();
        return ac;
    } catch {
        return null;
    }
}

function tone(f, at, dur, { type = 'sine', vol = 0.2, attack = 0.008, to = null, lp = null } = {}) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + at;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) {
        const filter = a.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lp;
        o.connect(filter);
        node = filter;
    }
    node.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
}

function noise(at, dur, { vol = 0.15, type = 'highpass', freq = 1200, sweepTo = null } = {}) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + at;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
}

// Do, mi, sol, do, mi: cada paso más agudo.
const NOTE = [523.25, 659.25, 783.99, 1046.5, 1318.51];

/** El sonido de un paso de la subida (0 = común … 4 = legendario). */
export function stepSound(i) {
    const f = NOTE[i];
    if (i === 0) { tone(f, 0, 0.35, { vol: 0.16 }); return; }
    if (i === 1) { tone(f, 0, 0.4, { type: 'triangle', vol: 0.16 }); tone(f * 1.5, 0.06, 0.4, { vol: 0.1 }); return; }
    if (i === 2) {
        [1, 1.25, 1.5].forEach((m, k) => tone(f * m, k * 0.05, 0.55, { type: 'triangle', vol: 0.13 }));
        tone(f * 3, 0.12, 0.4, { vol: 0.05 });
        return;
    }
    if (i === 3) {
        [1, 1.25, 1.5, 2].forEach((m, k) => tone(f * m, k * 0.045, 0.7, { type: 'triangle', vol: 0.12 }));
        tone(f / 4, 0, 0.6, { type: 'sawtooth', vol: 0.12, lp: 600 });
        noise(0, 0.5, { vol: 0.06, type: 'bandpass', freq: 2000, sweepTo: 6000 });
        return;
    }
    [1, 1.5, 2, 2.5].forEach((m, k) => tone((f / 2) * m, k * 0.02, 1.1, { type: 'sawtooth', vol: 0.07, lp: 2800, attack: 0.03 }));
    tone(120, 0, 0.7, { vol: 0.35, to: 40 });
    noise(0, 0.35, { vol: 0.12, type: 'lowpass', freq: 400 });
    [3, 4, 5, 6].forEach((m, k) => tone((f * m) / 2, 0.15 + k * 0.07, 0.3, { vol: 0.04 }));
}

/** El remate al abrirse, según la rareza (0 = común … 4 = legendario). */
export function revealSound(idx) {
    noise(0, 0.45, { vol: 0.09 + idx * 0.03, type: 'highpass', freq: 800, sweepTo: 6000 });
    const root = 261.63 * Math.pow(2, idx / 4);
    const chord = idx >= 3 ? [1, 1.25, 1.5, 2, 2.5] : idx >= 1 ? [1, 1.25, 1.5] : [1, 1.5];
    chord.forEach((m, k) => tone(root * m, 0.05 + k * 0.03, 0.9 + idx * 0.25, { type: idx >= 3 ? 'sawtooth' : 'triangle', vol: 0.09, lp: idx >= 3 ? 3000 : null, attack: 0.02 }));
    if (idx >= 2) tone(root / 2, 0.05, 1 + idx * 0.2, { vol: 0.18, to: root / 2.2 });
    if (idx === 4) {
        [1, 1.25, 1.5, 2].forEach((m, k) => tone(root * 1.5 * m, 0.55 + k * 0.03, 1.4, { type: 'sawtooth', vol: 0.07, lp: 3500, attack: 0.03 }));
        for (let k = 0; k < 10; k++) tone(1500 + ((k * 337) % 1800), 0.3 + k * 0.07, 0.25, { vol: 0.035 });
    }
}
