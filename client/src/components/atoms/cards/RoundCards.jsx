import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Drawer } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { API } from '../../../services/api';
import { useTheme as useAppTheme } from '../../../context/ThemeContext';
import useIsMobile from '../../../hooks/useIsMobile';
import { isRoundAim, matchName, playEffectText } from '../../../utils/cards';
import '../css/cards.css';

/** «Guille le echa el Gafe a Samir», «Samir juega la Doble»… (el panel) */
function sentence(p) {
    const who = p.mine ? 'Juegas' : `${p.user?.username || 'Alguien'} juega`;
    if (p.key === 'gafe') return `${p.mine ? 'Le echas' : `${p.user?.username || 'Alguien'} le echa`} el Gafe a ${p.target?.username || '¿?'}`;
    if (p.key === 'robo') return `${p.mine ? 'Le juegas' : `${p.user?.username || 'Alguien'} le juega`} el Robo a ${p.target?.username || '¿?'}`;
    if (p.key === 'espejo') return `${who} el Espejo`;
    return `${who} ${p.key === 'escudo' ? 'el Escudo' : p.key === 'chivato' ? 'el Chivato' : `la ${p.card.label}`}`;
}

/** Lo que pone la ficha de la cinta, en corto: «×2 G2 vs FNC», «Gafe a Morera»… */
function chipText(p, match) {
    const where = match ? ` ${matchName(match)}` : '';
    let t;
    if (p.key === 'doble') t = `×2${where}`;
    else if (p.key === 'dorada') t = `Dorada${where}`;
    else if (p.key === 'gafe') t = `Gafe a ${p.target?.username || '¿?'}`;
    else if (p.key === 'robo') t = `Robo a ${p.target?.username || '¿?'}`;
    else if (p.key === 'chivato') t = `Chivato${where}`;
    else t = p.card.label;
    return p.rebounded ? `${t} · rebota` : t;
}

/** Lo que más ha movido la jornada, primero: rebotes, luego por puntos. */
const weight = (p) => (p.rebounded || (p.key === 'espejo' && p.effect > 0) ? 100 : 0) + Math.abs(p.effect || 0) + (p.key === 'chivato' ? -50 : 0);

/**
 * Las cartas jugadas en la jornada, en Inicio: una cinta bajo la cabecera de la liga
 * con las jugadas que más han movido, y un panel lateral con todas, por partido.
 *
 * De los demás solo salen las ya reveladas (su partido ha empezado): lo decide el
 * servidor. Si no hay ninguna, no se pinta nada.
 *
 * @param {Object} props
 * @param {Object} props.league - Con `cards_enabled`.
 * @param {Object} props.round - La jornada elegida (`roundId`, `name`).
 * @param {Array<Object>} props.matches - Los partidos de la jornada, para nombrarlos.
 */
export default function RoundCards({ league, round, matches = [] }) {
    const [plays, setPlays] = useState([]);
    const [open, setOpen] = useState(false);
    const { getAvatarSrc } = useAppTheme();
    const isMobile = useIsMobile(576);

    useEffect(() => {
        if (!league?.cards_enabled || !round?.roundId) { setPlays([]); return; }
        let cancelled = false;
        API.get(`/cards/round/${round.roundId}`)
            .then(list => { if (!cancelled) setPlays(Array.isArray(list) ? list : []); })
            .catch(() => { if (!cancelled) setPlays([]); });
        return () => { cancelled = true; };
    }, [league?.cards_enabled, round?.roundId]);

    const matchOf = (p) => matches.find(x => x.id === p.match_id);
    const top = useMemo(() => [...plays].sort((a, b) => weight(b) - weight(a) || a.id - b.id), [plays]);

    // El panel: un grupo por partido (en el orden de la jornada) y uno para toda la jornada.
    const groups = useMemo(() => {
        const out = [];
        for (const m of matches) {
            const list = plays.filter(p => !isRoundAim(p.card.aim) && p.match_id === m.id);
            if (list.length) out.push({ key: m.id, title: matchName(m), list });
        }
        const loose = plays.filter(p => isRoundAim(p.card.aim) || !matches.some(m => m.id === p.match_id));
        if (loose.length) out.push({ key: 'round', title: 'Toda la jornada', list: loose });
        return out;
    }, [plays, matches]);

    if (!league?.cards_enabled || plays.length === 0) return null;

    const effect = (p) => {
        if (p.key === 'chivato') return null;
        const e = playEffectText(p);
        return <b className={`play-effect ${e.cls}`}>{e.text}</b>;
    };

    return (
        <>
            <section className="round-ribbon" aria-label={`Cartas de la ${round.name}`}>
                <span className="rr-label">Cartas · {round.shortLabel || round.name}</span>
                <div className="rr-chips">
                    {top.map(p => (
                        <button key={p.id} type="button" className={`rr-chip rar-${p.card.rarity}`} onClick={() => setOpen(true)} title={sentence(p)}>
                            <Avatar size={24} src={getAvatarSrc(p.user?.logo_url)} icon={<UserOutlined />} />
                            <b>{p.mine ? 'Tú' : p.user?.username}</b>
                            <span className="rr-what">{chipText(p, isRoundAim(p.card.aim) ? null : matchOf(p))}</span>
                            {effect(p)}
                        </button>
                    ))}
                </div>
                <button type="button" className="rr-all" onClick={() => setOpen(true)}>
                    Ver {plays.length === 1 ? 'la carta' : `las ${plays.length}`}
                </button>
            </section>

            <Drawer
                title={`Cartas de la ${round.name}`}
                open={open}
                onClose={() => setOpen(false)}
                placement={isMobile ? 'bottom' : 'right'}
                width={420}
                height="80vh"
                rootClassName="round-cards-drawer"
            >
                {groups.map(g => (
                    <div key={g.key} className="rcd-group">
                        <div className="rcd-title">{g.title}</div>
                        <div className="plays">
                            {g.list.map(p => (
                                <div key={p.id} className={`play-row rar-${p.card.rarity}`}>
                                    <div className="play-row-what">
                                        <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Avatar size={20} src={getAvatarSrc(p.user?.logo_url)} icon={<UserOutlined />} />
                                            {sentence(p)}
                                        </b>
                                        {!p.revealed && <small>Solo la ves tú hasta que empiece</small>}
                                    </div>
                                    <div className="play-row-side">{effect(p)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </Drawer>
        </>
    );
}
