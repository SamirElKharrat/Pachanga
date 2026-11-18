import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../../../services/api';
import { showAlert } from '../AlertInfo';
import { refreshCoins } from '../../../hooks/useCoins';
import { useTheme } from '../../../context/ThemeContext';
import { announceDuels, DUELS_EVENT, Swords, WhiteFlag } from './RoundDuel';
import '../css/duels.css';
import { duelSound } from './duelSound';
import '../css/duel-notice.css';

const LATER_KEY = 'pachanga_duel_later';

/** Los retos que has dejado para luego en esta sesión (no vuelven a saltar hasta que cierres). */
function laterIds() {
    try { return JSON.parse(sessionStorage.getItem(LATER_KEY) || '[]'); } catch { return []; }
}
function addLater(id) {
    try { sessionStorage.setItem(LATER_KEY, JSON.stringify([...laterIds(), id])); } catch { /* sin almacenamiento */ }
}

/**
 * El aviso a pantalla completa de los duelos: la pantalla partida en diagonal, con la
 * foto de cada uno de fondo. Tú a la izquierda, tu rival a la derecha y el «VS» que cae
 * en medio.
 *
 * - Cuando alguien te reta: Aceptar, Ahora no (vuelve a salir en otra sesión) o
 *   Rechazar.
 * - Cuando te aceptan un reto: una vez, con «Vale».
 *
 * Sin desenfoques ni filtros: solo transform y opacity.
 */
export default function DuelNotice() {
    const { getAvatarSrc } = useTheme();
    const [queue, setQueue] = useState([]);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        API.get('/duels/notices')
            .then(list => {
                if (!Array.isArray(list)) return;
                const later = new Set(laterIds());
                setQueue(list.filter(n => !(n.kind === 'challenge' && later.has(n.id))));
            })
            .catch(() => {});
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        window.addEventListener(DUELS_EVENT, load);
        return () => window.removeEventListener(DUELS_EVENT, load);
    }, [load]);

    const current = queue[0];

    // El «braam» cada vez que salta un aviso nuevo (si el navegador ya deja sonar).
    useEffect(() => {
        if (current) duelSound();
    }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const next = () => setQueue(q => q.slice(1));

    const later = () => {
        if (current?.kind === 'challenge') addLater(current.id);
        else if (current) API.post(`/duels/${current.id}/seen`).catch(() => {});
        next();
    };

    useEffect(() => {
        if (!current) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') later(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!current) return null;

    const answer = async (accept) => {
        if (accept) duelSound({ slamOnly: true });
        setBusy(true);
        try {
            await API.post(`/duels/${current.id}/respond`, { accept });
            showAlert('success', accept ? '¡Duelo aceptado! Suerte.' : 'Reto rechazado');
            refreshCoins({ quiet: true });
            next();
            announceDuels();
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo contestar');
            next();
        } finally {
            setBusy(false);
        }
    };

    const challenge = current.kind === 'challenge';
    const me = challenge ? current.rival : current.challenger;
    const him = challenge ? current.challenger : current.rival;
    // Los nombres largos, más pequeños: nunca se parten por dentro.
    const nameSize = (u) => ((u?.username || '').length > 12 ? ' xlong' : (u?.username || '').length > 8 ? ' long' : '');
    const photo = (u) => (u?.logo_url ? { '--ph': `url("${getAvatarSrc(u.logo_url)}")` } : undefined);
    const label = challenge ? `${him?.username} te reta a un duelo` : `${him?.username} acepta tu duelo`;

    return createPortal(
        <div className="dn" role="dialog" aria-modal="true" aria-label={label} key={current.id}>
            <div className="dn-stage">
                <div className={`dn-half dn-l${me?.logo_url ? ' has-ph' : ''}`} style={photo(me)}>
                    {!me?.logo_url && <span className="dn-initial" aria-hidden="true">{me?.username?.[0]?.toUpperCase()}</span>}
                    <span className="dn-lbl">Tú</span>
                    <span className={`dn-nm${nameSize(me)}`}>{me?.username}</span>
                </div>
                <div className={`dn-half dn-r${him?.logo_url ? ' has-ph' : ''}`} style={photo(him)}>
                    {!him?.logo_url && <span className="dn-initial" aria-hidden="true">{him?.username?.[0]?.toUpperCase()}</span>}
                    <span className="dn-lbl">{challenge ? 'Te reta' : 'Acepta'}</span>
                    <span className={`dn-nm${nameSize(him)}`}>{him?.username}</span>
                </div>
                <div className="dn-vs" aria-hidden="true">VS</div>
                <div className="dn-msg">
                    {challenge ? (
                        <div className="dn-btns">
                            <button type="button" className="rd-cta lg" onClick={() => answer(true)} disabled={busy} autoFocus>
                                <span className="rd-cta-ico" aria-hidden="true"><Swords /></span>
                                <span>Aceptar</span>
                            </button>
                            <button type="button" className="dn-btn" onClick={later} disabled={busy}>Ahora no</button>
                            <button type="button" className="rd-coward on-dark" onClick={() => answer(false)} disabled={busy} title="Rendirse sin pelear">
                                <WhiteFlag />
                                <span>Rechazar</span>
                            </button>
                        </div>
                    ) : (
                        <div className="dn-btns">
                            <button type="button" className="dn-btn primary" onClick={later} autoFocus>{queue.length > 1 ? 'Siguiente' : 'Vale'}</button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
