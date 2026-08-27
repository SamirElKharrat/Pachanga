import React, { useEffect, useState } from 'react';
import { Avatar, Button, Skeleton } from 'antd';
import { UserOutlined, BarChartOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { API } from '../../services/api';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import { paletteFor, distinctColorsFor } from '../../styles/theme';
import KpiTile from './stats/KpiTile';
import BulletBar from './stats/BulletBar';
import LineChart from './stats/LineChart';
import MomentCard from './stats/MomentCard';
import './css/stats.css';

/** Con menos partidos que esto, una media no es una media. */
const MIN_MATCHES = 5;

const num = (n) => (n == null ? '—' : n.toLocaleString('es-ES'));
const pct = (n) => (n == null ? '—' : (n * 100).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const dec = (n, d = 1) => (n == null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }));

/**
 * El módulo compacto de estadísticas. Rellena los dos huecos que había:
 * el de la clasificación de la Pachanga y el de la ficha de una liga.
 *
 * Mismo esqueleto en los dos casos —cifras arriba, dos paneles debajo— para que se
 * lean igual, pero el contenido cambia de naturaleza: en la Pachanga interesa quién
 * acumula, y dentro de una liga interesa qué pasó.
 *
 * @param {Object} props
 * @param {'pachanga'|'league'} props.variant
 * @param {number} [props.year]     - Temporada, en la variante pachanga.
 * @param {number} [props.leagueId] - Liga, en la variante league.
 * @param {string} [props.leagueName]
 * @param {Function} [props.onSeeMore] - Si falta, el botón queda deshabilitado.
 */
function StatsSummaryCard({ variant, year, leagueId, leagueName, onSeeMore }) {
    const { isLightMode, isWorlds, resolvedTheme, getAvatarSrc } = useAppTheme();
    const chart = paletteFor(resolvedTheme);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                setFailed(false);

                const scope = variant === 'league'
                    ? `leagueId=${leagueId}`
                    : `scope=pachanga&year=${year || new Date().getFullYear()}`;

                const [overview, players, moments] = await Promise.all([
                    API.get(`/stats/overview?${scope}`),
                    API.get(`/stats/players?${scope}`),
                    variant === 'league' ? API.get(`/stats/moments?leagueId=${leagueId}`) : Promise.resolve(null)
                ]);

                if (!cancelled) setData({ overview, players: players.players || [], moments: moments ? moments.moments : [] });
            } catch (error) {
                console.error('Error cargando estadísticas:', error);
                if (!cancelled) setFailed(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (variant === 'league' ? leagueId : true) load();
        return () => { cancelled = true; };
    }, [variant, year, leagueId]);

    const root = `pstats${isLightMode ? ' is-light' : ''}${isWorlds ? ' is-worlds' : ''}`;

    if (loading) {
        return (
            <div className={root}>
                <div className="pstats-card">
                    <Skeleton active paragraph={{ rows: 6 }} />
                </div>
            </div>
        );
    }

    if (failed || !data || !data.overview || !data.overview.totals) {
        return (
            <div className={root}>
                <div className="pstats-card">
                    <div className="pstats-empty">
                        {failed
                            ? 'No se pudieron cargar las estadísticas.'
                            : 'Todavía no hay partidos resueltos aquí.'}
                    </div>
                </div>
            </div>
        );
    }

    const { totals, leaders, progression, scope, reliable } = data.overview;
    const allIds = data.players.map(p => p.user.id);

    const seeMore = (
        <Button
            size="small"
            onClick={onSeeMore}
            disabled={!onSeeMore}
            title={onSeeMore ? undefined : 'Disponible en la próxima entrega'}
            icon={<ArrowRightOutlined />}
            iconPosition="end"
        >
            {variant === 'league' ? 'Ver más' : 'Ver todas las estadísticas'}
        </Button>
    );

    const avatarFor = (user, size = 26) => (
        <Avatar
            src={getAvatarSrc(user.logo_url)}
            icon={<UserOutlined />}
            size={size}
            aria-hidden="true"
        />
    );

    // Sin partidos suficientes las medias engañan: se enseña participación y se dice.
    if (!reliable) {
        return (
            <div className={root}>
                <div className="pstats-card">
                    <div className="pstats-head">
                        <div>
                            <h3 className="pstats-title">
                                <BarChartOutlined style={{ color: 'var(--s-accent)' }} />
                                {variant === 'league' ? `Estadísticas · ${leagueName || scope.leagues[0]?.name || ''}` : 'Estadísticas de la Pachanga'}
                            </h3>
                            <span className="pstats-sub">
                                {totals.matches} {totals.matches === 1 ? 'partido resuelto' : 'partidos resueltos'}
                            </span>
                        </div>
                    </div>
                    <div className="pstats-kpis" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <KpiTile hero label="Predicciones" value={num(totals.predictions)}
                                 foot={`de ${num(totals.possible)} posibles`} />
                        <KpiTile label="Participación" value={pct(totals.participation)} unit="%"
                                 foot={`${totals.players} jugadores`} />
                    </div>
                    <p className="pstats-note">
                        Con menos de {MIN_MATCHES} partidos resueltos no se enseñan medias:
                        con dos partidos, un 100 % de acierto no significa nada.
                    </p>
                </div>
            </div>
        );
    }

    // ── Variante Pachanga ────────────────────────────────────────────────────
    if (variant === 'pachanga') {
        // Distancia a la media, no acumulado en bruto: con totales tan pegados
        // (339, 337, 328) las tres lineas acumuladas se solapan en una sola banda.
        // Restando la media se separan y ademas se lee de un vistazo quien va por
        // encima y quien por debajo.
        const shown = (progression.series || []).slice(0, 3);
        const palette = distinctColorsFor(shown.map(s => s.user.id), allIds, resolvedTheme);
        const top = shown.map(s => {
            const c = palette[s.user.id];
            return {
                name: s.user.username,
                values: s.cumulative.map((v, i) => Math.round(v - (progression.average[i] ?? 0))),
                mark: c.mark,
                text: c.text
            };
        });

        const best = leaders.find(l => l.metric === 'bestRun');

        return (
            <div className={root}>
                <div className="pstats-card">
                    <div className="pstats-head">
                        <div>
                            <h3 className="pstats-title">
                                <BarChartOutlined style={{ color: 'var(--s-accent)' }} />
                                Estadísticas de la Pachanga
                            </h3>
                            <span className="pstats-sub">
                                Temporada {scope.year} · {scope.leagues.length} competiciones puntuables
                            </span>
                        </div>
                        <div className="pstats-actions">
                            {seeMore}
                        </div>
                    </div>

                    <div className="pstats-kpis">
                        <KpiTile hero label="Predicciones" value={num(totals.predictions)}
                                 foot={<>de {num(totals.possible)} posibles · <b>{pct(totals.participation)} %</b></>} />
                        <KpiTile label="Acierto" value={pct(totals.accuracy)} unit="%"
                                 foot={`${num(totals.exactScores)} de ${num(totals.possible)} posibles`} />
                        <KpiTile label="Acierto parcial" value={pct(totals.partialAccuracy)} unit="%"
                                 foot={`solo el ganador · ${num(totals.wins)} de ${num(totals.possible)}`} />
                        <KpiTile label="Mejor pleno" value={best ? best.value : '—'}
                                 foot={best ? <><span style={{ marginRight: 4 }}>{avatarFor(best.user, 20)}</span>{best.user.username}</> : null} />
                    </div>

                    <div className="pstats-split wide-left">
                        <div className="pstats-panel">
                            <div className="pstats-head" style={{ marginBottom: 14 }}>
                                <div>
                                    <h4 className="pstats-panel-title">Distancia a la media</h4>
                                    <p className="pstats-cap">
                                        Podio · puntos por encima de la media, tras cada{' '}
                                        {progression.axis === 'week' ? 'jornada' : 'competición'}
                                    </p>
                                </div>
                                <div className="pstats-legend">
                                    {top.map(s => (
                                        <span key={s.name} className="pstats-legend-item">
                                            <i style={{ background: s.mark }} />{s.name}
                                        </span>
                                    ))}
                                    <span className="pstats-legend-item muted">
                                        <i style={{ background: 'var(--s-ink-2)', width: 12, height: 2, borderRadius: 1 }} />
                                        La línea de 0 es la media
                                    </span>
                                </div>
                            </div>
                            <LineChart
                                labels={progression.labels}
                                series={top}
                                signed
                                baselineLabel="media"
                                ariaLabel={
                                    `Puntos por encima o por debajo de la media de los ${totals.players}, ` +
                                    `tras cada ${progression.axis === 'week' ? 'jornada' : 'competición'}. ` +
                                    top.map(s => {
                                        const v = s.values[s.values.length - 1];
                                        return `${s.name} termina ${v >= 0 ? v + ' por encima' : Math.abs(v) + ' por debajo'}`;
                                    }).join('; ') + '.'
                                }
                            />
                        </div>

                        <div className="pstats-panel">
                            <h4 className="pstats-panel-title" style={{ marginBottom: 14 }}>Líderes por métrica</h4>
                            <div className="pstats-list">
                                {leaders.slice(0, 4).map((l, i) => (
                                    <div key={l.metric} className={`pstats-row${i === 0 ? ' top' : ''}`}>
                                        {avatarFor(l.user)}
                                        <div className="pstats-row-body">
                                            <div className="pstats-row-name">{l.user.username}</div>
                                            <div className="pstats-cap">{l.label}</div>
                                        </div>
                                        <span className={`pstats-row-value${i === 0 ? ' gold' : ''}`}>
                                            {l.value < 1 && l.value > 0 ? `${pct(l.value)} %` : num(l.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="pstats-note">
                                Se ordena por la métrica, no por el ranking general: un jugador puede
                                liderar aquí y ser cuarto en la tabla.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Variante Liga ────────────────────────────────────────────────────────
    const byAccuracy = [...data.players].sort((a, b) => b.accuracy - a.accuracy);
    const momentMark = { divided: 2, upset: 4, unanimous: 3, bestRun: 1 };

    return (
        <div className={root}>
            <div className="pstats-card">
                <div className="pstats-head">
                    <div>
                        <h3 className="pstats-title">
                            Estadísticas · {leagueName || scope.leagues[0]?.name}
                        </h3>
                        <span className="pstats-sub">
                            {totals.matches} partidos resueltos · {totals.players} participantes
                        </span>
                    </div>
                    <div className="pstats-actions">

                        {seeMore}
                    </div>
                </div>

                <div className="pstats-kpis">
                    <KpiTile hero label="Acierto medio de la liga" value={pct(totals.accuracy)} unit="%"
                             foot={`ganador y marcador · ${num(totals.exactScores)} de ${num(totals.possible)}`} />
                    <KpiTile label="Acierto parcial" value={pct(totals.partialAccuracy)} unit="%"
                             foot={`solo el ganador · ${num(totals.wins)} de ${num(totals.possible)}`} />
                    <KpiTile label="Puntos medios" value={dec(totals.pointsAverage)}
                             foot={byAccuracy.length ? `líder ${data.players[0].user.username} con ${num(data.players[0].pointsOfficial)}` : null} />
                    <KpiTile label="Participación" value={pct(totals.participation)} unit="%"
                             foot={`${num(totals.predictions)} predicciones de ${num(totals.possible)} posibles`} />
                </div>

                <div className="pstats-split wide-right">
                    <div className="pstats-panel">
                        <div style={{ marginBottom: 14 }}>
                            <h4 className="pstats-panel-title">Acierto en la liga</h4>
                            <p className="pstats-cap">
                                Los {byAccuracy.length} participantes · ganador y marcador, sobre
                                todos los partidos y no solo los votados
                            </p>
                        </div>
                        {byAccuracy.map(p => (
                            <BulletBar
                                key={p.user.id}
                                label={<>{avatarFor(p.user, 22)}<span>{p.user.username}</span></>}
                                value={p.accuracy}
                                max={1}
                                marker={totals.accuracy}
                                display={`${pct(p.accuracy)} %`}
                                title={`${p.user.username} — ${pct(p.accuracy)} %`}
                            />
                        ))}
                        <div className="pstats-legend" style={{ marginTop: 14 }}>
                            <span className="pstats-legend-item muted">
                                <i style={{ background: 'var(--s-ink-2)', width: 2, height: 12, borderRadius: 1 }} />
                                Media de la liga ({pct(totals.accuracy)} %)
                            </span>
                        </div>
                    </div>

                    <div className="pstats-panel">
                        <h4 className="pstats-panel-title" style={{ marginBottom: 14 }}>Momentos de la liga</h4>
                        {data.moments.length === 0 ? (
                            <div className="pstats-empty">Todavía no hay momentos que contar.</div>
                        ) : (
                            <div className="pstats-list" style={{ gap: 11 }}>
                                {data.moments.map(m => {
                                    const i = momentMark[m.kind] ?? 0;
                                    return (
                                        <MomentCard
                                            key={m.kind}
                                            kind={m.kind}
                                            moment={m}
                                            mark={chart.series[i]}
                                            text={chart.text[i]}
                                        />
                                    );
                                })}
                            </div>
                        )}
                        <p className="pstats-note">
                            Se recalculan al cerrar cada jornada. Si una semana no da ninguno, la tarjeta
                            se salta el hueco en vez de inventarse un dato.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StatsSummaryCard;
