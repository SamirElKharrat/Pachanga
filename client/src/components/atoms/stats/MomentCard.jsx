import React from 'react';

/**
 * Uno de los momentos de una liga: el partido que os dividió, la sorpresa, la
 * unanimidad, el mejor pleno.
 *
 * La API devuelve números, no frases. El texto se redacta aquí, así que cambiar
 * cómo se cuenta no obliga a tocar la base de datos.
 *
 * @param {Object} props
 * @param {string} props.kind - divided | upset | unanimous | bestRun
 * @param {Object} props.moment - Elemento de /api/stats/moments.
 * @param {string} props.mark - Color de la franja lateral.
 * @param {string} props.text - Color del rótulo, ya con contraste de texto.
 */
function MomentCard({ kind, moment, mark, text }) {
    const pct = (n) => `${Math.round(n * 100)} %`;
    const versus = (moment.teams && moment.teams.length)
        ? moment.teams.join(' vs ')
        : `Partido ${moment.matchId}`;
    const score = moment.result ? ` ${moment.result}` : '';

    const COPY = {
        divided: {
            title: 'El más dividido',
            main: `${versus}${score}`,
            foot: `${Math.round(moment.topVoteShare * (moment.predictions || 0))} de ${moment.predictions} al equipo más votado · ` +
                  `${moment.correct} acertaron el ganador · jornada ${moment.week}`
        },
        upset: {
            title: 'La sorpresa',
            main: `${versus}${score}`,
            foot: moment.correct === 0
                ? `Ninguno de los ${moment.predictions} lo vio venir · jornada ${moment.week}`
                : `Solo ${moment.correct} de ${moment.predictions} lo vieron venir · jornada ${moment.week}`
        },
        unanimous: {
            title: 'Unanimidad',
            main: `${versus}${score}`,
            foot: `${moment.correct} de ${moment.predictions} al ganador · ` +
                  `${moment.exact} clavaron el marcador · jornada ${moment.week}`
        },
        bestRun: {
            title: 'Mejor pleno de la liga',
            main: `${moment.user ? moment.user.username : '—'} · ${moment.length} seguidas`,
            foot: `Jornada ${moment.week}${moment.bonus ? ` · +${moment.bonus} pts de bonus` : ''}`
        }
    };

    const copy = COPY[kind];
    if (!copy) return null;

    return (
        <div className="pstats-moment" style={{ '--m-mark': mark, '--m-text': text }}>
            <div className="pstats-moment-kind">{copy.title}</div>
            <div className="pstats-moment-main">{copy.main}</div>
            <div className="pstats-moment-foot">{copy.foot}</div>
        </div>
    );
}

export default MomentCard;
