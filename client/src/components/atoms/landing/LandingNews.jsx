import React from 'react';
import { Typography } from 'antd';
import { motion } from 'framer-motion';
import { CardEmblem } from '../cards/CardArt';
import { Swords } from '../duels/RoundDuel';
import { CoinIcon } from '../CoinBalance';
import EsportsChest, { EsportsChestDefs } from '../chests/EsportsChest';
import { Banner } from '../cosmetics/Banner';
import ScreenshotCarousel, { NEW_SHOTS } from '../ScreenshotCarousel';
import '../css/cards.css';
import '../css/duels.css';
import '../css/coins.css';
import '../css/chest-opening.css';
import '../css/cosmetics.css';
import '../css/banners.css';
import '../css/landing-news.css';

const { Title, Paragraph, Text } = Typography;

/**
 * Las cinco cartas del abanico. Son las de verdad (mismo diseño «Naipe», mismos
 * emblemas); los textos, los cortos de la mano.
 */
const FAN = [
    { key: 'escudo', label: 'Escudo', rarity: 'raro', tag: 'Rara', text: 'Un fallo no rompe tu pleno.' },
    { key: 'gafe', label: 'Gafe', rarity: 'raro', tag: 'Rara', text: 'Si tu rival falla, pierde 2.' },
    { key: 'doble', label: 'Doble', rarity: 'epico', tag: 'Épica', text: 'Dobla un partido (hasta +5).' },
    { key: 'robo', label: 'Robo', rarity: 'raro', tag: 'Rara', text: 'Si le ganas la jornada, le quitas 1.' },
    { key: 'espejo', label: 'Espejo', rarity: 'epico', tag: 'Épica', text: 'Te echan un castigo: rebota.' },
];

/** Lo que se gana con pachanguitas (server/utils/coinRewards.js). */
const EARN = [
    { n: '+3', what: 'jornada completa' },
    { n: '+3', what: 'cada pleno' },
    { n: '+5', what: 'racha de 3 jornadas' },
    { n: '+1', what: 'entrar al día' },
];

/** Las probabilidades del cofre, tal cual las enseña la tienda (server/utils/chests.js). */
const ODDS = [
    { rar: 'comun', pct: 60, label: 'Común' },
    { rar: 'poco', pct: 25, label: 'Poco común' },
    { rar: 'raro', pct: 11, label: 'Raro' },
    { rar: 'epico', pct: 3.5, label: 'Épico' },
    { rar: 'leg', pct: 0.5, label: 'Legendario' },
];

const tileIn = (i) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
});

/** Una carta del abanico: entra repartida desde abajo y se abre al pasar el ratón. */
function FanCard({ card, i }) {
    const off = i - (FAN.length - 1) / 2;
    return (
        <motion.div
            className="lnew-fan-slot"
            style={{ '--off': off, zIndex: 10 - Math.abs(off) }}
            initial={{ opacity: 0, y: 160 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 140, damping: 16, delay: 0.15 + i * 0.09 }}
        >
            <div className={`card-tile lnew-card rar-${card.rarity}`}>
                <span className="card-rar"><span>{card.tag}</span><span className="card-gem" /></span>
                <CardEmblem cardKey={card.key} />
                <b>{card.label}</b>
                <p>{card.text}</p>
            </div>
        </motion.div>
    );
}

/**
 * Las novedades de la portada: cartas, duelos, pachanguitas, cofres y la tienda,
 * cada una con una muestra viva hecha con las mismas piezas que la web (no son
 * vídeos ni GIFs), y debajo el carrusel con las capturas de esas pantallas.
 *
 * Solo transform y opacity en las animaciones; con «reducir movimiento», quietas.
 *
 * @param {Object} props
 * @param {Function} props.onJoin - Lleva a iniciar sesión.
 */
export default function LandingNews({ onJoin }) {
    return (
        <section className="lnew" id="novedades" style={{ scrollMarginTop: 80 }}>
            <motion.div className="lnew-head" {...tileIn(0)}>
                <span className="lnew-eyebrow"><i aria-hidden="true" />Nuevo en la Pachanga</span>
                <Title level={2} className="lnew-title">Acertar ya no es suficiente</Title>
                <Paragraph type="secondary" className="lnew-lead">
                    Cartas que te suman puntos o se los quitan a otro, duelos uno contra uno, una moneda propia,
                    cofres y una tienda para presumir. Todo dentro de tus ligas, y sin dinero real.
                </Paragraph>
            </motion.div>

            <div className="lnew-grid">
                {/* ── Cartas ── */}
                <motion.article className="lnew-tile is-cards" {...tileIn(0)}>
                    <div className="lnew-copy">
                        <span className="lnew-kicker">Cartas</span>
                        <Title level={3} className="lnew-h">Juega tus cartas</Title>
                        <Text type="secondary" className="lnew-p">
                            Hasta 2 por jornada: dobla un partido, protege tu pleno, échale el Gafe al de al lado o
                            róbale un punto. Nadie ve tu carta hasta que empieza el partido.
                        </Text>
                    </div>
                    <div className="lnew-fan" aria-label="Cinco cartas: Escudo, Gafe, Doble, Robo y Espejo">
                        {FAN.map((c, i) => <FanCard key={c.key} card={c} i={i} />)}
                        <span className="lnew-pop is-plus" aria-hidden="true">+5</span>
                        <span className="lnew-pop is-minus" aria-hidden="true">−2</span>
                    </div>
                </motion.article>

                {/* ── Duelos ── */}
                <motion.article className="lnew-tile is-duel" {...tileIn(1)}>
                    <div className="lnew-vs" aria-hidden="true">
                        <span className="lnew-vs-half is-l"><b>Tú</b></span>
                        <span className="lnew-vs-half is-r"><b>Rival</b></span>
                        <span className="lnew-vs-word">VS</span>
                    </div>
                    <div className="lnew-copy">
                        <span className="lnew-kicker">Duelos</span>
                        <Title level={3} className="lnew-h">Reta a quien quieras</Title>
                        <Text type="secondary" className="lnew-p">
                            Uno contra uno en la jornada: quien haga más puntos se lleva lo apostado, en puntos de liga o en pachanguitas.
                        </Text>
                        <button type="button" className="rd-cta sm lnew-cta" onClick={onJoin}>
                            <span className="rd-cta-ico" aria-hidden="true"><Swords /></span>
                            <span>Retar a alguien</span>
                        </button>
                    </div>
                </motion.article>

                {/* ── Pachanguitas ── */}
                <motion.article className="lnew-tile is-coin" {...tileIn(2)}>
                    <div className="lnew-coin-stage" aria-hidden="true">
                        <span className="lnew-coin"><CoinIcon size={84} /></span>
                        <span className="lnew-coin-shadow" />
                    </div>
                    <div className="lnew-copy">
                        <span className="lnew-kicker">Pachanguitas</span>
                        <Title level={3} className="lnew-h">La moneda de la casa</Title>
                        <ul className="lnew-earn">
                            {EARN.map(e => (
                                <li key={e.what}><b>{e.n}</b><span>{e.what}</span></li>
                            ))}
                        </ul>
                    </div>
                </motion.article>

                {/* ── Cofres ── */}
                <motion.article className="lnew-tile is-chest" {...tileIn(3)}>
                    <div className="lnew-chest-stage" aria-hidden="true">
                        <span className="lnew-chest-rays" />
                        <EsportsChestDefs />
                        <span className="lnew-chest"><EsportsChest size={1.15} /></span>
                    </div>
                    <div className="lnew-copy">
                        <span className="lnew-kicker">Cofres</span>
                        <Title level={3} className="lnew-h">Ábrelo y cruza los dedos</Title>
                        <div className="lnew-odds" role="img" aria-label={ODDS.map(o => `${o.label} ${String(o.pct).replace('.', ',')} %`).join(', ')}>
                            {ODDS.map(o => <span key={o.rar} className={`rar-${o.rar}`} style={{ flexGrow: Math.max(o.pct, 2.5) }} />)}
                        </div>
                        <Text type="secondary" className="lnew-p">Probabilidades a la vista y un premio raro asegurado cada 10.</Text>
                    </div>
                </motion.article>

                {/* ── Tienda y perfil ── */}
                <motion.article className="lnew-tile is-look" {...tileIn(4)}>
                    <div className="lnew-look" aria-hidden="true">
                        <Banner id="banner_baron" className="lnew-look-banner" />
                        <span className="lnew-look-who">
                            <span className="cos-frame frame_flame"><span className="lnew-look-avatar">P</span></span>
                            <span className="lnew-look-text">
                                <span className="cos-name color_arcoiris lnew-look-name">Pachanguero</span>
                                <span className="cos-title">Lo vi venir</span>
                            </span>
                        </span>
                    </div>
                    <div className="lnew-copy">
                        <span className="lnew-kicker">Tienda</span>
                        <Title level={3} className="lnew-h">Que se note quién eres</Title>
                        <Text type="secondary" className="lnew-p">
                            Banners animados, marcos, colores de nombre y títulos. El escaparate cambia cada semana.
                        </Text>
                    </div>
                </motion.article>
            </div>

            <motion.div {...tileIn(0)} className="lnew-shots">
                <ScreenshotCarousel shots={NEW_SHOTS} label="Pantallas nuevas" />
            </motion.div>
        </section>
    );
}
