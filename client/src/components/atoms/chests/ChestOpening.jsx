import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from 'antd';
import { SoundOutlined, MutedOutlined } from '@ant-design/icons';
import { ChestBody, ChestLid, EsportsChestDefs } from './EsportsChest';
import { isSoundOn, revealSound, setSoundOn, stepSound } from './chestSound';
import '../css/chest-opening.css';

/** Las rarezas en orden y su color. Fijos: la apertura siempre va sobre fondo oscuro. */
const RARITIES = ['comun', 'poco', 'raro', 'epico', 'leg'];
const RARITY_COLOR = { comun: '#cbd5e1', poco: '#10b981', raro: '#3b82f6', epico: '#a855f7', leg: '#f5d576' };

const STEP = 520;      // entre una subida de color y la siguiente
const FIRST = 250;     // el primer paso (gris), en cuanto se pulsa
const HOLD = 480;      // tras el último paso, antes de abrir

/** 18 chispas en abanico, con distancias y tiempos algo distintos. */
const SPARKS = Array.from({ length: 18 }, (_, i) => ({
    '--a': `${i * 20 + (i % 3) * 4}deg`,
    '--r': `${110 + (i * 37) % 70}px`,
    '--t': `${(0.7 + (i % 4) * 0.12).toFixed(2)}s`,
    '--d': `${((i % 5) * 0.02).toFixed(2)}s`,
}));

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * La apertura de un cofre a pantalla completa, «Subida de color»:
 *
 * 1. Al pulsar, el cofre empieza a cargarse en gris mientras el servidor tira el dado.
 * 2. Con la rareza ya sabida, la luz va subiendo de color (verde, azul, morado,
 *    dorado) hasta pararse en la que ha tocado: el cofre se balancea cada vez más y
 *    cada paso suena más épico.
 * 3. Se encoge un instante, la tapa sale volando hacia arriba, hay destello, chispas
 *    y un haz de luz, y el premio sube y se queda flotando.
 *
 * Solo transform y opacity (nada de filtros: la lección de Ligas en Firefox). Con
 * «reducir movimiento», el premio sale directo.
 *
 * @param {Object} props
 * @param {string} props.chestName
 * @param {Object|null} props.prize - El premio (de POST /chests/open); null mientras se tira.
 * @param {React.ReactNode} props.prizeLook - El premio dibujado (va en la carta).
 * @param {string} props.prizeShort - Nombre corto para la carta.
 * @param {string|null} props.note - La línea de debajo («Va a tu mano…»).
 * @param {Function} props.onClose
 * @param {Function} [props.onAgain] - Si se puede abrir otro.
 */
export default function ChestOpening({ chestName, prize, prizeLook, prizeShort, note, onClose, onAgain }) {
    const [step, setStep] = useState(-1);
    const [phase, setPhase] = useState('charging'); // charging → squash → revealed → idle
    const [rings, setRings] = useState([]);
    const [sound, setSound] = useState(isSoundOn());
    const timers = useRef([]);
    const quick = useRef(reducedMotion());

    const later = (ms, fn) => { timers.current.push(setTimeout(fn, ms)); };
    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const goStep = (i) => {
        setStep(i);
        stepSound(i);
        const id = `${i}-${Date.now()}`;
        setRings(r => [...r, { id, color: RARITY_COLOR[RARITIES[i]] }]);
        later(1000, () => setRings(r => r.filter(x => x.id !== id)));
    };

    // El primer paso, en gris, nada más pulsar.
    useEffect(() => {
        if (quick.current) return;
        later(FIRST, () => goStep(0));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Con el premio ya sabido: seguir subiendo hasta su rareza y abrir.
    useEffect(() => {
        if (!prize) return;
        const target = RARITIES.indexOf(prize.rarity);
        if (quick.current) {
            setStep(target);
            setPhase('idle');
            return;
        }
        // Lo que falte del primer paso (por si el servidor contesta antes de 250 ms).
        const start = FIRST + 40;
        for (let i = 1; i <= target; i++) later(start + (i - 1) * STEP + STEP, () => goStep(i));
        const end = start + target * STEP + HOLD;
        later(end, () => setPhase('squash'));
        later(end + 260, () => { setPhase('revealed'); revealSound(target); });
        later(end + 1250, () => setPhase('idle'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prize]);

    // Esc cierra cuando ya se ve el premio.
    useEffect(() => {
        if (phase !== 'idle') return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [phase, onClose]);

    const stepRarity = step >= 0 ? RARITIES[step] : null;
    const final = prize ? RARITY_COLOR[prize.rarity] : RARITY_COLOR.comun;
    const opened = phase === 'revealed' || phase === 'idle';
    const classes = [
        'co',
        phase === 'charging' && step >= 0 ? 'charging' : '',
        phase === 'squash' ? 'squash' : '',
        opened ? 'revealed prize-on' : '',
        phase === 'idle' ? 'idle' : '',
        quick.current ? 'quick' : '',
    ].join(' ');

    const toggleSound = () => { const on = !sound; setSound(on); setSoundOn(on); };

    return createPortal(
        <div
            className={classes}
            role="dialog"
            aria-modal="true"
            aria-label={chestName}
            style={{
                '--rc': final,
                '--gem': stepRarity && !opened ? RARITY_COLOR[stepRarity] : opened ? final : '#38bdf8',
                '--amp': String(1.2 + Math.max(0, step) * 1.1),
                '--speed': `${Math.max(0.18, 0.5 - Math.max(0, step) * 0.08)}s`,
            }}
        >
            <EsportsChestDefs />
            <button type="button" className="co-sound" onClick={toggleSound} aria-label={sound ? 'Quitar el sonido' : 'Poner el sonido'} title={sound ? 'Quitar el sonido' : 'Poner el sonido'}>
                {sound ? <SoundOutlined /> : <MutedOutlined />}
            </button>
            <div className="co-name">{chestName}</div>

            <div className="co-scene">
                {RARITIES.map(r => (
                    <div key={r} className={`co-halo${(opened ? prize?.rarity : stepRarity) === r ? ' on' : ''}`} style={{ '--c': RARITY_COLOR[r] }} />
                ))}
                <div className="co-rays"><div className="co-rays-scale"><div className="co-rays-spin" /></div></div>
                {rings.map(r => <div key={r.id} className="co-ring" style={{ '--c': r.color }} />)}
                <div className="co-beam" />
                <div className="co-chest">
                    <div className="co-float"><div className="co-shake"><div className="co-squash">
                        <div className="co-shadow" />
                        <div className="co-in" />
                        <div className="co-lid"><ChestLid /></div>
                        <div className="co-body"><ChestBody /><i className="co-gem-glow" /></div>
                        {RARITIES.map(r => (
                            <div key={r} className={`co-seam${stepRarity === r && !opened ? ' on' : ''}`} style={{ '--c': RARITY_COLOR[r] }} />
                        ))}
                    </div></div></div>
                </div>
                {SPARKS.map((s, i) => <i key={i} className="co-spark" style={s} />)}
                <div className="co-prize">
                    <div className="co-prize-float">
                        <div className="co-card">
                            <span className="co-card-rar">{prize?.rarityLabel}</span>
                            <div className="co-card-look">{prizeLook}</div>
                            <b>{prizeShort}</b>
                        </div>
                    </div>
                </div>
            </div>
            <div className="co-flash" />

            <div className="co-info">
                {phase === 'idle' && prize && (
                    <>
                        <div className="co-label">{prize.label}{prize.guaranteed ? ' · por la garantía' : ''}</div>
                        {note && <div className="co-note">{note}</div>}
                        <div className="co-actions">
                            <Button type="primary" onClick={onClose} autoFocus>Vale</Button>
                            {onAgain && <Button onClick={onAgain}>Abrir otro</Button>}
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
