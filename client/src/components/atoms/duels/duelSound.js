import { isSoundOn } from '../chests/chestSound';

/**
 * El sonido del aviso de duelo: el «braam» de tráiler (elegido entre siete propuestas).
 * Un barrido de aire mientras entran las dos mitades y, al caer el «VS», un zumbido
 * grave que se abre con un golpe sub. Sintetizado con Web Audio: no hay archivos.
 *
 * Respeta el mismo silencio que los cofres (chests/chestSound.js).
 *
 * Los navegadores no dejan sonar nada hasta que el usuario ha pulsado algo en la
 * página: si el aviso salta nada más cargar, puede que no suene; al pulsar «Aceptar»
 * sí suena siempre.
 */

let ac = null;
let master = null;
let noiseBuf = null;

function ctx() {
    if (!isSoundOn()) return null;
    try {
        if (!ac) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            ac = new Ctx();
            const comp = ac.createDynamicsCompressor();
            comp.threshold.value = -14;
            comp.ratio.value = 4;
            master = ac.createGain();
            master.gain.value = 0.55;
            master.connect(comp);
            comp.connect(ac.destination);
            noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
            const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ac.state === 'suspended') ac.resume();
        return ac.state === 'running' || ac.state === 'suspended' ? ac : null;
    } catch {
        return null;
    }
}

function envelope(g, t, attack, peak, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(t, f, dur, { type = 'sine', vol = 0.3, attack = 0.006, to = null, lp = null, lpTo = null } = {}) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    envelope(g, t, attack, vol, dur);
    let node = o;
    if (lp) {
        const fl = ac.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.value = lp;
        if (lpTo) fl.frequency.exponentialRampToValueAtTime(lpTo, t + dur);
        o.connect(fl);
        node = fl;
    }
    node.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
}

function noise(t, dur, { vol = 0.3, attack = 0.005, type = 'lowpass', f = 1000, to = null, q = 0.8 } = {}) {
    const s = ac.createBufferSource();
    const g = ac.createGain();
    const fl = ac.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + attack + dur);
    s.buffer = noiseBuf;
    envelope(g, t, attack, vol, dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(master);
    s.start(t, Math.random());
    s.stop(t + attack + dur + 0.05);
}

/**
 * El «braam», sincronizado con la animación del aviso: las mitades entran en 0–0,45 s
 * y el «VS» cae a los 0,5 s.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.slamOnly] - Solo el golpe (al aceptar, sin la entrada).
 */
export function duelSound({ slamOnly = false } = {}) {
    const a = ctx();
    if (!a) return;
    try {
        const t = a.currentTime + 0.03;
        if (!slamOnly) noise(t, 0.16, { vol: 0.16, attack: 0.29, type: 'bandpass', f: 120, to: 1400, q: 1.2 });
        const s = slamOnly ? t : t + 0.5;
        [55, 55.4, 110, 82.4].forEach((f, i) => tone(s, f, 1.6, { type: 'sawtooth', vol: i < 2 ? 0.16 : 0.09, attack: 0.03, lp: 160, lpTo: 900 }));
        tone(s, 41, 1.4, { vol: 0.6, attack: 0.01, to: 30 });
        noise(s, 0.9, { vol: 0.14, attack: 0.04, f: 220, to: 90 });
    } catch {
        // Sin sonido no pasa nada.
    }
}
