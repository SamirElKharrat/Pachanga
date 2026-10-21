import React, { useEffect, useRef, useState } from 'react';
import { Typography, Spin, Empty, Flex, Button } from 'antd';
import { SoundOutlined, MutedOutlined } from '@ant-design/icons';
import { API } from '../../services/api';
import './css/IsGuilleWinning.css';

const { Title, Text } = Typography;

/**
 * La cara de Guillermo, recortada en Cloudinary de su foto (`guille_ztqp14`): solo
 * los ojos y la sonrisa, sin el texto que lleva la foto debajo.
 */
const GUILLERMO_FACE = 'https://res.cloudinary.com/dusai4gbp/image/upload/w_800/c_crop,w_460,h_316,x_170,y_306/w_260,f_auto,q_auto/guille_ztqp14';

/** Lo que dice la página según cómo le vaya. Guillermo sonríe en las dos. */
const quoteFor = (isWinning, stats) => {
    if (isWinning === 'SÍ') {
        return stats ? `Va primero en ${stats.leagueName}. Mírale qué contento.` : 'Mírale qué contento.';
    }
    return stats
        ? `Va ${stats.position}.º en ${stats.leagueName}. Sonríe igual: eso no se lo quita nadie.`
        : 'Sonríe igual: eso no se lo quita nadie.';
};

/** Cuántos Guillermos saltan, gane o no. */
const FROGS = 6;

const random = (min, max) => min + Math.random() * (max - min);

/**
 * Cada rana con su tamaño, altura de salto y ritmo. Se calcula una sola vez: si se
 * recalculase en cada render, saltarían de sitio al croar.
 */
function makeFrogs(count) {
    return Array.from({ length: count }, (_, i) => {
        const hop = random(0.9, 1.5);
        return {
            id: i,
            left: i % 2 === 1,
            size: Math.round(random(70, 130)),
            ground: `${Math.round(random(4, 70))}%`,
            height: `${Math.round(random(60, 160))}px`,
            tilt: `${Math.round(random(-12, 12))}deg`,
            hop: `${hop.toFixed(2)}s`,
            // Cruzar la pantalla lleva un número entero de saltos, así aterriza a ras.
            cross: `${(hop * Math.round(random(7, 13))).toFixed(2)}s`,
            delay: `${(-random(0, 12)).toFixed(2)}s`,
            restX: `${Math.round(random(5, 85))}vw`,
            pitch: random(0.85, 1.25),
        };
    });
}

/**
 * Un croac sintetizado con Web Audio, sin ningún archivo de sonido: un diente de
 * sierra grave que baja de tono, con trémolo rápido para que raspe y dos golpes de
 * volumen («cro-ac»). `pitch` hace que cada rana suene un poco distinta.
 *
 * @param {AudioContext} ctx
 * @param {number} [pitch=1]
 */
function playCroak(ctx, pitch = 1) {
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

/**
 * La charca: Guillermos que cruzan la pantalla saltando.
 *
 * Tocar uno lo hace croar. Además, mientras el sonido esté activado, de vez en
 * cuando croa alguno solo. Los navegadores no dejan sonar nada hasta que la
 * persona toca la página, así que el primer croac llega con el primer toque.
 */
function FrogPond({ winning, soundOn }) {
    const [frogs] = useState(() => makeFrogs(FROGS));
    const [croaking, setCroaking] = useState({});
    const audio = useRef(null);

    const getAudio = () => {
        if (!audio.current) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            audio.current = new Ctx();
        }
        if (audio.current.state === 'suspended') audio.current.resume();
        return audio.current;
    };

    // La clave cambia en cada croac para que el bocadillo vuelva a animarse.
    const showCroak = (id) => setCroaking(c => ({ ...c, [id]: (c[id] || 0) + 1 }));

    const croak = (frog) => {
        if (soundOn) {
            const ctx = getAudio();
            if (ctx) playCroak(ctx, frog.pitch);
        }
        showCroak(frog.id);
    };

    // Croacs sueltos de fondo. Solo suenan si el navegador ya ha dado permiso.
    useEffect(() => {
        if (!soundOn) return;
        const id = setInterval(() => {
            if (!audio.current || audio.current.state !== 'running') return;
            const frog = frogs[Math.floor(Math.random() * frogs.length)];
            playCroak(audio.current, frog.pitch);
            showCroak(frog.id);
        }, winning ? 2600 : 4200);
        return () => clearInterval(id);
    }, [soundOn, frogs, winning]);

    // El primer toque en cualquier sitio de la página desbloquea el sonido.
    useEffect(() => {
        if (!soundOn) return;
        const unlock = () => {
            const ctx = getAudio();
            if (ctx) playCroak(ctx, 1);
        };
        window.addEventListener('pointerdown', unlock, { once: true });
        return () => window.removeEventListener('pointerdown', unlock);
    }, [soundOn]);

    useEffect(() => () => { audio.current?.close(); }, []);

    return (
        <div className="guille-pond" aria-hidden="true">
            {frogs.map(f => (
                <div
                    key={f.id}
                    className={`guille-frog${f.left ? ' is-left' : ''}`}
                    style={{ '--ground': f.ground, '--cross': f.cross, '--delay': f.delay, '--rest-x': f.restX }}
                >
                    <div
                        className="guille-frog-hop"
                        style={{ '--hop': f.hop, '--height': f.height, '--tilt': f.tilt, '--delay': f.delay }}
                    >
                        {croaking[f.id] && <span key={croaking[f.id]} className="guille-croak">¡Croac!</span>}
                        <img
                            className="guille-frog-face"
                            src={GUILLERMO_FACE}
                            alt=""
                            draggable={false}
                            style={{ '--size': `${f.size}px` }}
                            onPointerDown={(e) => { e.stopPropagation(); croak(f); }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

const IsGuilleWinning = () => {
    const [isWinning, setIsWinning] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Puesto, puntos y liga de Guille, para la frase de debajo. Null si no hay liga con gente.
    const [stats, setStats] = useState(null);
    // El croac se puede silenciar; se recuerda en este navegador.
    const [soundOn, setSoundOn] = useState(() => {
        try { return localStorage.getItem('pachanga.guille.sound') !== 'off'; } catch { return true; }
    });

    const GUILLE_ID = 27;

    useEffect(() => {
        try { localStorage.setItem('pachanga.guille.sound', soundOn ? 'on' : 'off'); } catch { /* sin almacenamiento */ }
    }, [soundOn]);

    useEffect(() => {
        const checkGuille = async () => {
            try {
                setLoading(true);
                // 1. Get all leagues to find the current active one
                const leagues = await API.get('/leagues/get');
                if (!leagues || leagues.length === 0) {
                    setIsWinning('NO');
                    return;
                }

                // Get the most recent live league
                const liveLeagues = leagues
                    .filter(l => l.status === 'live')
                    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                let currentLeague = liveLeagues[0];

                // Fallback to the most recent finished league if no live league exists
                if (!currentLeague) {
                    const finishedLeagues = leagues
                        .filter(l => l.status === 'finished')
                        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                    currentLeague = finishedLeagues[0];
                }

                // Ultimate fallback to the overall most recent league (e.g. scheduled)
                if (!currentLeague) {
                    const sortedLeagues = [...leagues].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                    currentLeague = sortedLeagues[0];
                }

                // 2. Get participants and their points for this league
                const participants = await API.get(`/leagueParticipations/get/participants/${currentLeague.id}`);

                if (!participants || participants.length === 0) {
                    setIsWinning('NO');
                    return;
                }

                // Sort by points descending
                const sorted = [...participants].sort((a, b) => (b.points || 0) - (a.points || 0));

                const position = sorted.findIndex(p => p.user_id === GUILLE_ID) + 1;
                if (position > 0) {
                    setStats({
                        position,
                        points: sorted[position - 1].points || 0,
                        total: sorted.length,
                        leagueName: currentLeague.name,
                    });
                }

                // Check if the top one is Guille
                if (sorted[0].user_id === GUILLE_ID) {
                    setIsWinning('SÍ');
                } else {
                    setIsWinning('NO');
                }
            } catch (err) {
                console.error("Error checking if Guille is winning:", err);
                setError("No se pudo calcular la victoria de Guille.");
            } finally {
                setLoading(false);
            }
        };

        checkGuille();
    }, []);

    if (loading) {
        return (
            <Flex vertical align="center" justify="center" gap={16} style={{ height: '70vh' }}>
                <Spin size="large" />
                <Text type="secondary">Calculando el destino de Guille...</Text>
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex align="center" justify="center" style={{ padding: 40 }}>
                <Empty description={error} />
            </Flex>
        );
    }

    return (
        <div className={`guille-page ${isWinning === 'SÍ' ? 'is-winning' : 'is-losing'}`}>
            <FrogPond winning={isWinning === 'SÍ'} soundOn={soundOn} />

            <Button
                className="guille-sound"
                shape="round"
                icon={soundOn ? <SoundOutlined /> : <MutedOutlined />}
                onClick={() => setSoundOn(on => !on)}
                aria-pressed={soundOn}
            >
                {soundOn ? 'Croac activado' : 'Croac silenciado'}
            </Button>

            <div className="guille-verdict">
                <Title
                    style={{
                        fontSize: 'clamp(80px, 15vw, 180px)',
                        margin: 0,
                        color: isWinning === 'SÍ' ? 'var(--success-vivid)' : 'var(--danger-vivid)',
                        lineHeight: 1,
                        textShadow: isWinning === 'SÍ' ? '0 0 60px rgba(var(--success-vivid-rgb),0.4)' : '0 0 60px rgba(var(--danger-vivid-rgb),0.4)'
                    }}
                >
                    {isWinning}
                </Title>
                <Text type="secondary" className="guille-quote">{quoteFor(isWinning, stats)}</Text>
                <Text type="secondary" style={{ fontSize: 12, opacity: 0.6 }}>Toca un Guillermo para oírlo</Text>
            </div>
        </div>
    );
};

export default IsGuilleWinning;
