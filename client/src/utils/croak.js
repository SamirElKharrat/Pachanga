/**
 * Un croac sintetizado con Web Audio, sin ningún archivo de sonido: un diente de
 * sierra grave que baja de tono, con trémolo rápido para que raspe y dos golpes de
 * volumen («cro-ac»). `pitch` hace que cada rana suene un poco distinta.
 *
 * @param {AudioContext} ctx
 * @param {number} [pitch=1]
 */
export function playCroak(ctx, pitch = 1) {
    const t = ctx.currentTime;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    out.gain.exponentialRampToValueAtTime(0.04, t + 0.11);
    out.gain.exponentialRampToValueAtTime(0.4, t + 0.16);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    out.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.Q.value = 8;
    filter.connect(out);

    // El trémolo: una ganancia que oscila muy rápido sobre la voz.
    const rasp = ctx.createGain();
    rasp.gain.value = 0.6;
    rasp.connect(filter);
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 42 * pitch;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.45;
    lfo.connect(lfoDepth).connect(rasp.gain);

    const voice = ctx.createOscillator();
    voice.type = 'sawtooth';
    voice.frequency.setValueAtTime(150 * pitch, t);
    voice.frequency.exponentialRampToValueAtTime(85 * pitch, t + 0.4);
    voice.connect(rasp);

    voice.start(t);
    lfo.start(t);
    voice.stop(t + 0.45);
    lfo.stop(t + 0.45);
}

let sharedContext = null;

/**
 * Un croac suelto, para quien no tiene su propio AudioContext (el botón de
 * Opciones, por ejemplo). Reutiliza uno compartido. Hay que llamarlo desde un
 * clic: los navegadores no dejan sonar nada antes.
 *
 * @param {number} [pitch=1]
 */
export function croakOnce(pitch = 1) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!sharedContext) sharedContext = new Ctx();
    if (sharedContext.state === 'suspended') sharedContext.resume();
    playCroak(sharedContext, pitch);
}
