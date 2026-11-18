import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../../../services/api';
import { matchName } from '../../../utils/cards';
import '../css/gafe-notice.css';

const BOLT = <path d="M13 2L4 14h7l-1 8 9-12h-7z" />;

/** Título y subtítulo de cada caso. */
function texts(n) {
    const who = n.from?.username || 'Alguien';
    const match = <b>{matchName(n.match)}</b>;
    if (n.state === 'hit') {
        return {
            title: `El Gafe de ${who} te ha pillado`,
            sub: n.points > 0
                ? <>Fallaste {match} · −{n.points} {n.points === 1 ? 'punto' : 'puntos'}</>
                : <>Fallaste {match}, pero no tenías puntos que perder</>,
        };
    }
    if (n.state === 'miss' && n.rebounded) {
        return { title: 'Tu Espejo ha devuelto el Gafe', sub: <>{who} te lo echó en {match} y le ha rebotado a él</> };
    }
    if (n.state === 'miss') {
        return { title: 'Te has librado del Gafe', sub: <>{who} te lo echó en {match} y acertaste</> };
    }
    return { title: `${who} te ha echado el Gafe`, sub: <>en {match} · si fallas el ganador, pierdes 2 puntos</> };
}

/**
 * El aviso a pantalla completa de cuando te echan el Gafe: cae la carta, tiembla y se
 * agrieta. Si te ha pillado se raja en rojo; si te has librado, la grieta se cierra y
 * brilla en verde.
 *
 * Pide al servidor los avisos que te quedan por ver (server/utils/cards.js,
 * gafeNotices) y los enseña de uno en uno. Cerrar uno lo marca como visto, así que
 * cada Gafe avisa como mucho dos veces: al empezar su partido y con el resultado.
 *
 * Sin desenfoques ni filtros: solo transform y opacity.
 */
export default function GafeNotice() {
    const [queue, setQueue] = useState([]);

    useEffect(() => {
        let alive = true;
        API.get('/cards/notices')
            .then(list => { if (alive && Array.isArray(list)) setQueue(list); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);

    const current = queue[0];

    useEffect(() => {
        if (!current) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!current) return null;

    function close() {
        const n = queue[0];
        if (!n) return;
        API.post(`/cards/notices/${n.id}/seen`, { state: n.state === 'pending' ? 'pending' : 'resolved' }).catch(() => {});
        setQueue(q => q.slice(1));
    }

    const { title, sub } = texts(current);

    return createPortal(
        <div className={`gn k-${current.state}`} role="dialog" aria-modal="true" aria-label={title} key={current.id}>
            <div className="gn-stage">
                <div className="gn-card" aria-hidden="true">
                    <div className="gn-tint" />
                    <span className="gn-rar">Rara</span>
                    <span className="gn-emb"><svg viewBox="0 0 24 24">{BOLT}</svg></span>
                    <span className="gn-name">Gafe</span>
                    <svg className="gn-crack" viewBox="0 0 116 162" preserveAspectRatio="none">
                        <path d="M58 70 L48 50 L52 30 L40 8" />
                        <path d="M58 70 L74 86 L70 110 L86 140" />
                        <path d="M58 70 L30 84 L18 112" />
                        <path d="M58 70 L88 60 L108 40" />
                    </svg>
                </div>
                <div className="gn-msg">
                    {current.league?.name && <div className="gn-league">{current.league.name}</div>}
                    <div className="gn-title">{title}</div>
                    <div className="gn-sub">{sub}</div>
                    <button type="button" className="gn-ok" onClick={close} autoFocus>
                        {queue.length > 1 ? 'Siguiente' : 'Vale'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
