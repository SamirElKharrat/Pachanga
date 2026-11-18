import React, { useMemo } from 'react';
import { useEquipped } from '../../../hooks/useCosmetics';
import '../css/banners.css';

/**
 * Los banners de la tienda: fondos animados dibujados con CSS (sin imágenes de
 * Riot). El aspecto de cada uno vive en css/banners.css con el id del catálogo
 * (server/utils/shop.js); aquí solo se ponen las piezas que se mueven.
 */

/** Las piezas de cada banner: partículas, focos, engranajes… */
const PARTS = {
    banner_baron: { n: 14, d: [3, 6] },
    banner_infernal: { n: 16, d: [2, 4] },
    banner_confeti: { n: 22, d: [2.5, 4.5], confetti: true },
    banner_freljord: { n: 22, d: [4, 8] },
    banner_zaun: { n: 12, d: [3, 6] },
    banner_ionia: { n: 16, d: [5, 9] },
    banner_sombra: { n: 12, d: [4, 7] },
};
const CONFETTI = ['#f5d576', '#3b82f6', '#ef4444', '#10b981', '#a855f7', '#fbbf24'];

/** Un número entre 0 y 1, siempre el mismo para (i, k): reparte sin que cambie al pintar. */
const scatter = (i, k) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
};

const Gear = () => (
    <svg viewBox="0 0 40 40" aria-hidden="true"><path fill="currentColor" d="M17 2h6l1 5 4 2 4-3 4 4-3 4 2 4 5 1v6l-5 1-2 4 3 4-4 4-4-3-4 2-1 5h-6l-1-5-4-2-4 3-4-4 3-4-2-4-5-1v-6l5-1 2-4-3-4 4-4 4 3 4-2zM20 13a7 7 0 100 14 7 7 0 000-14z" /></svg>
);

function pieces(id) {
    if (id === 'banner_nexo') {
        return [<i key="b" className="ring b" />, <i key="a" className="ring" />, <i key="c" className="core" />];
    }
    if (id === 'banner_shurima') return [<i key="s" className="sun" />];
    if (id === 'banner_escenario') {
        return [0, 1, 2, 3].map(i => (
            <i key={i} className="beam" style={{ left: `${15 + i * 23}%`, '--d': `${5 + i * 1.3}s`, '--delay': `${-i * 1.7}s` }} />
        ));
    }
    if (id === 'banner_piltover') {
        return [
            { s: 90, l: '6%', t: -20, d: 14 }, { s: 58, l: '22%', t: 42, d: 9, r: true },
            { s: 120, rt: -20, t: -10, d: 20 }, { s: 44, rt: '20%', b: -8, d: 7, r: true },
        ].map((g, i) => (
            <i key={i} className={`gear${g.r ? ' r' : ''}`} style={{ width: g.s, height: g.s, left: g.l, right: g.rt, top: g.t, bottom: g.b, '--d': `${g.d}s` }}><Gear /></i>
        ));
    }
    const p = PARTS[id];
    if (!p) return null;
    const [a, z] = p.d;
    return Array.from({ length: p.n }, (_, i) => (
        <i
            key={i}
            className="p"
            style={{
                left: `${(scatter(i, 1) * 100).toFixed(1)}%`,
                '--d': `${(a + scatter(i, 2) * (z - a)).toFixed(2)}s`,
                '--delay': `${(-scatter(i, 3) * z).toFixed(2)}s`,
                '--dx': `${((scatter(i, 4) - 0.5) * 40).toFixed(0)}px`,
                '--rot': `${(scatter(i, 5) * 540).toFixed(0)}deg`,
                ...(p.confetti ? { '--c': CONFETTI[i % CONFETTI.length] } : {}),
            }}
        />
    ));
}

/**
 * Un banner.
 *
 * @param {Object} props
 * @param {string} props.id - Id del catálogo (banner_baron…).
 * @param {boolean} [props.still] - Quieto (se mueve al pasar el ratón por encima de
 *   un `.cos-banner-host`). En listas largas como la clasificación.
 * @param {string} [props.className]
 * @param {Object} [props.style]
 */
export function Banner({ id, still = false, className = '', style }) {
    const kids = useMemo(() => pieces(id), [id]);
    if (!id) return null;
    return (
        <div className={`cos-banner ${id}${still ? ' still' : ''} ${className}`} style={style} aria-hidden="true">
            {kids}
        </div>
    );
}

/**
 * El banner que lleva puesto un jugador, de fondo (absoluto, ocupando su caja) con
 * un velo oscuro encima para que se lea lo que va delante. Nada si no lleva.
 *
 * @param {Object} props
 * @param {number} [props.userId]
 * @param {string|null} [props.banner] - Forzar uno (o `null` para ninguno).
 * @param {boolean} [props.still]
 * @param {'left'|'sides'|'none'} [props.veil='left'] - Dónde oscurecer.
 */
export function BannerBackground({ userId, banner, still = false, veil = 'left' }) {
    const equipped = useEquipped(userId);
    const id = banner !== undefined ? banner : equipped.banner;
    if (!id) return null;
    return (
        <>
            <Banner id={id} still={still} className="cos-banner-bg" />
            {veil !== 'none' && <div className={`cos-banner-veil ${veil}`} aria-hidden="true" />}
        </>
    );
}
