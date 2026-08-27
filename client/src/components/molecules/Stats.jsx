import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Avatar, Button, Select, Skeleton, Typography } from 'antd';
import { UserOutlined, ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { API } from '../../services/api';
import useIsMobile from '../../hooks/useIsMobile';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import { paletteFor, colorForUser, distinctColorsFor } from '../../styles/theme';
import KpiTile from '../atoms/stats/KpiTile';
import BulletBar from '../atoms/stats/BulletBar';
import LineChart from '../atoms/stats/LineChart';
import StackedPointsBar from '../atoms/stats/StackedPointsBar';
import Heatmap from '../atoms/stats/Heatmap';
import DotPlot from '../atoms/stats/DotPlot';
import CompareRow from '../atoms/stats/CompareRow';
import SortableStatsTable from '../atoms/stats/SortableStatsTable';
import EmptyState from '../atoms/stats/EmptyState';
import '../atoms/css/stats.css';

const TABS = [
    { key: 'jugadores', label: 'Jugadores' },
    { key: 'resumen', label: 'Resumen' },
    { key: 'ligas', label: 'Ligas' },
    { key: 'jugador', label: 'Ficha de jugador' },
    { key: 'comparar', label: 'Comparar' },
];

const num = (n) => (n == null ? '—' : n.toLocaleString('es-ES'));
const pct = (n) => (n == null ? '—' : `${(n * 100).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`);
const dec = (n, d = 2) => (n == null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }));
const signed = (n, d = 1) => (n == null ? '—' : `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })}`);

/**
 * La vista completa de estadísticas.
 *
 * Una sola ruta para los dos botones: el selector de ámbito decide si estás mirando la
 * Pachanga entera o una liga suelta, y las cinco pestañas son las mismas en ambos
 * casos. Lo único que cambia es el conjunto de partidos.
 *
 * El estado vive en la URL (?liga=, ?year=, ?tab=, ?jugador=, ?a=, ?b=), así que un
 * enlace a una ficha o a un comparador concreto se puede pegar en el grupo y abre
 * exactamente lo mismo.
 */
export default function Stats() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { isLightMode, isWorlds, resolvedTheme, getAvatarSrc } = useAppTheme();
    const chart = paletteFor(resolvedTheme);
    const esMovil = useIsMobile();
    // Ant Design da el tamaño por prop, no por CSS, así que esto no se puede resolver
    // con una media query: en móvil los controles pasan de 24 a 32 px de alto.
    const ctl = esMovil ? 'middle' : 'small';

    const leagueId = params.get('liga');
    const year = params.get('year');
    const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'jugadores';

    const [meta, setMeta] = useState(null);      // ligas y temporadas disponibles
    const [data, setData] = useState(null);      // overview + players del ámbito
    const [detail, setDetail] = useState(null);  // ficha o comparación
    const [detailFailed, setDetailFailed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const scopeQuery = leagueId
        ? `leagueId=${leagueId}`
        : `scope=pachanga&year=${year || new Date().getFullYear()}`;

    const setParam = useCallback((patch) => {
        const next = new URLSearchParams(params);
        Object.entries(patch).forEach(([k, v]) => {
            if (v === null || v === undefined || v === '') next.delete(k);
            else next.set(k, String(v));
        });
        setParams(next, { replace: false });
    }, [params, setParams]);

    // ── El ámbito: una carga para todo lo que las cinco pestañas comparten ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setFailed(false);
                const [overview, players, leagues] = await Promise.all([
                    API.get(`/stats/overview?${scopeQuery}`),
                    API.get(`/stats/players?${scopeQuery}`),
                    API.get(`/stats/leagues?year=${year || overviewYear(params) || new Date().getFullYear()}`),
                ]);
                if (cancelled) return;
                setData({ overview, players: players.players || [] });
                setMeta({ leagues: leagues.leagues || [], years: leagues.years || [] });
            } catch (error) {
                console.error('Error cargando estadísticas:', error);
                if (!cancelled) setFailed(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [scopeQuery]); // eslint-disable-line react-hooks/exhaustive-deps

    const players = data ? data.players : [];
    const allIds = players.map(p => p.user.id);
    const colorOf = useCallback((id) => colorForUser(id, allIds, resolvedTheme), [allIds, resolvedTheme]);

    // Quién se mira en la ficha y quiénes se comparan, con el primero como defecto.
    const focusId = Number(params.get('jugador')) || (players[0] && players[0].user.id);
    const aId = Number(params.get('a')) || (players[0] && players[0].user.id);
    const bId = Number(params.get('b')) || (players[1] && players[1].user.id);

    // ── El detalle de la pestaña abierta ──
    useEffect(() => {
        let cancelled = false;
        if (!players.length) return undefined;

        (async () => {
            try {
                if (!cancelled) setDetailFailed(false);

                if (tab === 'jugador' && focusId) {
                    const r = await API.get(`/stats/player/${focusId}?${scopeQuery}`);
                    if (!cancelled) setDetail({ kind: 'jugador', ...r });
                } else if (tab === 'comparar' && aId && bId && aId !== bId) {
                    const r = await API.get(`/stats/compare?${scopeQuery}&a=${aId}&b=${bId}`);
                    if (!cancelled) setDetail({ kind: 'comparar', ...r });
                } else {
                    if (!cancelled) setDetail(null);
                }
            } catch (error) {
                // Sin esto, un jugador sin datos en el ámbito deja el esqueleto girando
                // para siempre: «cargando» y «no hay nada» se veían igual.
                console.error('Error cargando el detalle:', error);
                if (!cancelled) { setDetail(null); setDetailFailed(true); }
            }
        })();
        return () => { cancelled = true; };
    }, [tab, focusId, aId, bId, scopeQuery, players.length]);

    /**
     * Teclado en las pestañas, como manda el patrón de tablist: flechas para moverse,
     * Inicio y Fin a los extremos. El foco tiene que ir detrás de la selección — si se
     * queda en el botón anterior, quien navega a ciegas cambia de pestaña y sigue oyendo
     * el nombre de la que dejó atrás.
     */
    const goToTab = useCallback((e) => {
        const i = TABS.findIndex(x => x.key === tab);
        const salto = { ArrowRight: 1, ArrowLeft: -1 };
        let destino = null;

        if (salto[e.key] !== undefined) destino = TABS[(i + salto[e.key] + TABS.length) % TABS.length];
        else if (e.key === 'Home') destino = TABS[0];
        else if (e.key === 'End') destino = TABS[TABS.length - 1];
        if (!destino) return;

        e.preventDefault();
        setParam({ tab: destino.key });
        const boton = document.getElementById(`pstats-tab-${destino.key}`);
        if (boton) boton.focus();
    }, [tab, setParam]);

    const root = `pstats${isLightMode ? ' is-light' : ''}${isWorlds ? ' is-worlds' : ''}`;

    if (loading) {
        return (
            <div className={root} style={wrap}>
                <div className="pstats-card"><Skeleton active paragraph={{ rows: 10 }} /></div>
            </div>
        );
    }

    if (failed || !data || !data.overview) {
        return (
            <div className={root} style={wrap}>
                <div className="pstats-card">
                    <EmptyState
                        title="No se pudieron cargar las estadísticas"
                        detail="Puede ser un corte momentáneo del servidor. Si vuelve a pasar, avisa."
                        actionLabel="Reintentar"
                        onAction={() => window.location.reload()}
                    />
                </div>
            </div>
        );
    }

    const { overview } = data;
    const { totals, scope, reliable } = overview;

    // Qué clase de vacío es, si es que lo es. Un cero no explica nada por sí solo:
    // «0 partidos» puede ser una liga que no ha empezado, una temporada sin ligas o
    // una liga en la que nadie ha votado todavía, y cada una se arregla distinto.
    const nothing = (() => {
        if (!scope.leagues.length) {
            return {
                title: `No hay competiciones en ${scope.year}`,
                detail: 'Esa temporada no tiene ninguna liga dada de alta. Prueba con otra en el selector de arriba.',
            };
        }
        if (!totals || totals.matches === 0) {
            return scope.type === 'league'
                ? {
                    title: 'Esta liga todavía no ha empezado',
                    detail: 'En cuanto se cierre el primer resultado aparecerán aquí los aciertos, los plenos y la progresión.',
                    actionLabel: 'Ver la Pachanga entera',
                    onAction: () => setParam({ liga: null }),
                }
                : {
                    title: `La temporada ${scope.year} todavía no ha empezado`,
                    detail: 'Hay competiciones dadas de alta pero ningún partido cerrado. Vuelve cuando ruede la bola.',
                };
        }
        if (!players.length) {
            return {
                title: 'Nadie ha votado todavía',
                detail: 'Hay partidos jugados pero ninguna predicción enviada, así que no hay nada que medir.',
            };
        }
        if (!reliable) {
            return {
                title: `Solo hay ${totals.matches} ${totals.matches === 1 ? 'partido cerrado' : 'partidos cerrados'}`,
                detail: 'Con tan pocos, una media dice más del azar que de nadie. A partir de cinco se enseñan los porcentajes.',
                ...(scope.type === 'league'
                    ? { actionLabel: 'Ver la Pachanga entera', onAction: () => setParam({ liga: null }) }
                    : {}),
            };
        }
        return null;
    })();

    return (
        <div className={root} style={wrap}>
            {/* ─── Cabecera ─── */}
            <div className="pstats-head">
                <div>
                    <Typography.Title level={1} className="pstats-h1">Estadísticas</Typography.Title>
                    <span className="pstats-sub">
                        {scope.type === 'league'
                            ? scope.leagues[0] && scope.leagues[0].name
                            : `Pachanga ${scope.year} · ${scope.leagues.length} competiciones`}
                        {totals ? ` · ${totals.matches} partidos · ${totals.players} jugadores` : ''}
                    </span>
                </div>
                <div className="pstats-actions">
                    <Button size={ctl} icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                </div>
            </div>

            {/* ─── Una sola barra de filtros, para las cinco pestañas ─── */}
            <div className="pstats-filters" style={{ marginBottom: 18 }}>
                <span className="pstats-filter-label">Ámbito</span>
                <Select
                    size={ctl}
                    aria-label="Ámbito"
                    style={{ minWidth: 190 }}
                    value={leagueId || 'pachanga'}
                    onChange={(v) => setParam({ liga: v === 'pachanga' ? null : v })}
                    options={[
                        { value: 'pachanga', label: 'Pachanga' },
                        ...(meta ? meta.leagues : []).map(l => ({ value: String(l.id), label: l.name })),
                    ]}
                />

                <span className="pstats-filter-label" style={{ marginLeft: 6 }}>Temporada</span>
                <Select
                    size={ctl}
                    aria-label="Temporada"
                    style={{ minWidth: 130 }}
                    value={Number(year || scope.year)}
                    onChange={(v) => setParam({ year: v, liga: null })}
                    options={conHuerfana(
                        (meta && meta.years.length ? meta.years : [scope.year]).map(y => ({ value: y, label: String(y) })),
                        Number(year || scope.year),
                        (v) => `${v} · sin datos`
                    )}
                />

                <span style={{ flex: 1 }} />
                <span className="pstats-cap">Todo lo de abajo responde a estos dos filtros</span>
            </div>

            {/* ─── Pestañas ─── */}
            <div className="pstats-tabs" role="tablist" aria-label="Secciones de estadísticas">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        id={`pstats-tab-${t.key}`}
                        role="tab"
                        type="button"
                        className="pstats-tab"
                        aria-selected={tab === t.key}
                        aria-controls="pstats-panel"
                        tabIndex={tab === t.key ? 0 : -1}
                        onClick={() => setParam({ tab: t.key })}
                        onKeyDown={goToTab}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div id="pstats-panel" role="tabpanel" aria-labelledby={`pstats-tab-${tab}`} tabIndex={-1}>
            {nothing ? (
                <div className="pstats-panel" style={{ marginTop: 18 }}>
                    <EmptyState {...nothing} />
                </div>
            ) : (
                <div style={{ marginTop: 18 }}>
                    {tab === 'jugadores' && <TabJugadores players={players} scope={scope} getAvatarSrc={getAvatarSrc} ctl={ctl} esMovil={esMovil} />}
                    {tab === 'resumen' && <TabResumen overview={overview} players={players} allIds={allIds} colorOf={colorOf} getAvatarSrc={getAvatarSrc} chart={chart} themeName={resolvedTheme} esMovil={esMovil} />}
                    {tab === 'ligas' && <TabLigas meta={meta} year={year || scope.year} getAvatarSrc={getAvatarSrc} onPick={(id) => setParam({ liga: id })} />}
                    {tab === 'jugador' && (
                        <TabJugador
                            detail={detail} detailFailed={detailFailed} players={players}
                            focusId={focusId} scope={scope} colorOf={colorOf}
                            getAvatarSrc={getAvatarSrc} ctl={ctl} chart={chart}
                            onPick={(id) => setParam({ jugador: id })}
                            onCompare={(id) => setParam({ tab: 'comparar', a: id })}
                            onScope={() => setParam({ liga: null })}
                        />
                    )}
                    {tab === 'comparar' && (
                        <TabComparar
                            detail={detail} detailFailed={detailFailed} players={players}
                            aId={aId} bId={bId} scope={scope}
                            allIds={allIds} themeName={resolvedTheme} getAvatarSrc={getAvatarSrc} ctl={ctl}
                            onPick={(which, id) => setParam({ [which]: id })}
                            onScope={() => setParam({ liga: null })}
                        />
                    )}
                </div>
            )}
            </div>
        </div>
    );
}

const wrap = { padding: '16px 20px 60px', maxWidth: 1180, margin: '0 auto', width: '100%' };

/**
 * Añade la opción que falta cuando el valor de la URL no está entre las disponibles.
 *
 * Un desplegable cuyo valor no coincide con ninguna opción se queda en blanco o enseña
 * otra cosa: el filtro decía «2026» mientras la página hablaba de 1999, o «Karim»
 * mientras el mensaje hablaba de otro. Mejor que el control diga la verdad aunque la
 * verdad sea rara.
 *
 * @param {Array<{value: *, label: string}>} options
 * @param {*} value - Lo que hay seleccionado ahora.
 * @param {Function} [label] - Cómo llamar a la opción huérfana.
 */
const conHuerfana = (options, value, label = () => '— sin datos aquí —') => {
    const actual = value === '' || value == null ? null : value;
    if (actual === null || options.some(o => String(o.value) === String(actual))) return options;
    return [{ value: actual, label: label(actual), disabled: true }, ...options];
};

/** Saca el año del ámbito cuando no viene explícito en la URL. */
const overviewYear = (params) => (params.get('year') ? Number(params.get('year')) : null);

/** Avatar con la inicial marcada como decorativa: no debe leerse antes del nombre. */
const Face = ({ user, getAvatarSrc, size = 26 }) => (
    <Avatar src={getAvatarSrc(user.logo_url)} icon={<UserOutlined />} size={size} aria-hidden="true" />
);

// ═══════════════════════════════════════════════════════════════════════════
//  Jugadores
// ═══════════════════════════════════════════════════════════════════════════

function TabJugadores({ players, scope, getAvatarSrc, ctl, esMovil }) {
    const spark = (row) => {
        const values = scope.leagues.map(l => {
            const b = row.byLeague.find(x => x.leagueId === l.id);
            return b ? b.pointsOfficial : 0;
        });
        if (values.length < 2) return null;
        const top = Math.max(...values, 1);
        const points = values.map((v, i) =>
            `${(i / (values.length - 1)) * 60},${18 - (v / top) * 16}`).join(' ');
        return (
            <svg width="62" height="20" viewBox="0 0 62 20" aria-label={`Por competición: ${values.join(', ')} puntos`}>
                <polyline fill="none" stroke="var(--s-accent)" strokeWidth="1.6" strokeLinejoin="round" points={points} />
            </svg>
        );
    };

    const columns = [
        { key: 'rank', label: '#', align: 'left', sortable: false, render: (r, i) => <span className="pstats-pos">{i + 1}</span> },
        {
            key: 'name', label: 'Jugador', align: 'left',
            sortValue: (r) => r.user.username,
            render: (r) => <span className="pstats-cell-name"><Face user={r.user} getAvatarSrc={getAvatarSrc} size={24} />{r.user.username}</span>
        },
        { key: 'predictions', label: 'Preds', title: 'Predicciones enviadas' },
        { key: 'participation', label: 'Partic.', render: (r) => pct(r.participation) },
        { key: 'accuracy', label: 'Acierto', title: 'Ganador y marcador, sobre todos los partidos', render: (r) => <span className="strong">{pct(r.accuracy)}</span> },
        { key: 'partialAccuracy', label: 'Parcial', title: 'Solo el ganador', render: (r) => pct(r.partialAccuracy) },
        { key: 'exactScores', label: 'Aciertos', title: 'Ganador y marcador' },
        { key: 'wins', label: 'Parciales', title: 'Solo el ganador' },
        { key: 'plenos', label: 'Plenos' },
        { key: 'bestRun', label: 'Mejor pleno' },
        { key: 'pointsOfficial', label: 'Puntos', render: (r) => <span className="strong">{num(r.pointsOfficial)}</span> },
        { key: 'pointsPerPrediction', label: 'Pts/pred', render: (r) => dec(r.pointsPerPrediction) },
        { key: 'byLeague', label: 'Por liga', sortable: false, render: spark },
    ];

    /**
     * Exporta la tabla tal y como está, generada aquí a partir de lo que ya se cargó.
     *
     * Separador de punto y coma y coma decimal, que es lo que espera el Excel español;
     * con el punto decimal, «0.685» le entra como texto y no se puede ni sumar. Los
     * porcentajes van como número de 0 a 100 con su unidad en la cabecera, en vez de la
     * fracción, para que la columna se lea sin traducir nada mentalmente.
     */
    const csv = () => {
        const esc = (v) => {
            const s = String(v == null ? '' : v);
            return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const dec2 = (n) => (n == null ? '' : (Math.round(n * 100) / 100).toString().replace('.', ','));
        const pc = (n) => (n == null ? '' : (Math.round(n * 1000) / 10).toString().replace('.', ','));

        const head = ['Jugador', 'Puesto', 'Predicciones', 'Participacion (%)', 'Acierto (%)',
                      'Acierto parcial (%)', 'Aciertos', 'Parciales', 'Plenos', 'Mejor pleno',
                      'Puntos', 'Puntos por prediccion'];

        const lines = players.map((p, i) => [
            p.user.username, p.rank || i + 1, p.predictions, pc(p.participation), pc(p.accuracy),
            pc(p.partialAccuracy), p.exactScores, p.wins, p.plenos, p.bestRun,
            p.pointsOfficial, dec2(p.pointsPerPrediction)
        ].map(esc).join(';'));

        // El BOM es lo que hace que Excel abra el archivo como UTF-8 y no parta las tildes.
        const texto = '﻿' + [head.join(';'), ...lines].join('\r\n');
        const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' });

        const nombre = scope.type === 'league'
            ? (scope.leagues[0] || {}).name || 'liga'
            : `pachanga-${scope.year}`;

        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `estadisticas-${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Revocar en el mismo tick corta la descarga en algunos navegadores.
        setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    return (
        <div className="pstats-panel">
            <div className="pstats-head" style={{ marginBottom: 14 }}>
                <div>
                    <h4 className="pstats-panel-title">Los {players.length} jugadores, todas las métricas</h4>
                    <p className="pstats-cap">
                        Pincha una cabecera para ordenar · esta tabla es también la versión legible de las gráficas
                    </p>
                </div>
                <Button size={ctl} icon={<DownloadOutlined />} onClick={csv}>Exportar CSV</Button>
            </div>

            <SortableStatsTable
                columns={columns}
                rows={players}
                initialSort="pointsOfficial"
                rowKey={(r) => r.user.id}
            />

            <p className="pstats-note">
                <b>Acierto</b> es acertar el ganador <em>y</em> el marcador; <b>parcial</b> es solo el
                ganador. Los dos se miden sobre todos los partidos que había, así que saltarse una
                jornada baja el porcentaje: es lo que separa a quien acierta de quien acierta poco pero
                elige bien cuándo votar.
            </p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Resumen
// ═══════════════════════════════════════════════════════════════════════════

function TabResumen({ overview, players, allIds, colorOf, getAvatarSrc, chart, themeName, esMovil }) {
    const { totals, leaders, progression, byFormat } = overview;

    // Los colores se reparten entre los tres que se pintan, no por índice global: con
    // más de seis jugadores los índices dan la vuelta y salían dos líneas iguales.
    const shown = (progression.series || []).slice(0, 3);
    const palette = distinctColorsFor(shown.map(s => s.user.id), allIds, themeName);
    const top = shown.map(s => {
        const c = palette[s.user.id];
        return {
            name: s.user.username,
            values: s.cumulative.map((v, i) => Math.round(v - (progression.average[i] ?? 0))),
            mark: c.mark,
            text: c.text,
        };
    });

    const origins = [
        { key: 'base', name: 'Ganador', color: chart.series[0] },
        { key: 'exact', name: 'Marcador', color: chart.series[1] },
        { key: 'streak', name: 'Pleno', color: chart.series[2] },
        { key: 'favorite', name: 'Favorito', color: chart.series[3] },
    ];

    return (
        <>
            <div className="pstats-kpis">
                <KpiTile hero label="Puntos repartidos" value={num(totals.pointsOfficial)}
                         foot={`${dec(totals.pointsAverage, 1)} de media`} />
                <KpiTile label="Predicciones" value={num(totals.predictions)}
                         foot={`${pct(totals.participation)} de participación`} />
                <KpiTile label="Acierto" value={pct(totals.accuracy)}
                         foot={`ganador y marcador · ${num(totals.exactScores)} de ${num(totals.possible)}`} />
                <KpiTile label="Acierto parcial" value={pct(totals.partialAccuracy)}
                         foot={`solo el ganador · ${num(totals.wins)} de ${num(totals.possible)}`} />
            </div>

            <div className="pstats-panel" style={{ marginTop: 14 }}>
                <div className="pstats-head" style={{ marginBottom: 14 }}>
                    <div>
                        <h4 className="pstats-panel-title">Distancia a la media</h4>
                        <p className="pstats-cap">
                            Podio · puntos por encima de la media, tras cada {progression.axis === 'week' ? 'jornada' : 'competición'}
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
                    wide={!esMovil}
                    baselineLabel="media"
                    ariaLabel={
                        `Puntos por encima o por debajo de la media. ` +
                        top.map(s => {
                            const v = s.values[s.values.length - 1];
                            return `${s.name} termina ${v >= 0 ? v + ' por encima' : Math.abs(v) + ' por debajo'}`;
                        }).join('; ') + '.'
                    }
                />
            </div>

            <div className="pstats-panel-grid wide-left">
                <div className="pstats-panel">
                    <div className="pstats-head" style={{ marginBottom: 14 }}>
                        <div>
                            <h4 className="pstats-panel-title">De dónde sale cada punto</h4>
                            <p className="pstats-cap">Proporción, no escala común · el total va a la derecha</p>
                        </div>
                        <div className="pstats-legend">
                            {origins.map(o => (
                                <span key={o.key} className="pstats-legend-item">
                                    <i style={{ background: o.color }} />{o.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {players.map(p => (
                        <StackedPointsBar
                            key={p.user.id}
                            label={<><Face user={p.user} getAvatarSrc={getAvatarSrc} size={22} /><span>{p.user.username}</span></>}
                            parts={origins.map(o => ({
                                key: o.key, name: o.name, color: o.color,
                                value: p[`points${o.key[0].toUpperCase()}${o.key.slice(1)}`] || 0,
                            }))}
                            total={num(p.points)}
                        />
                    ))}

                </div>

                <div>
                    <div className="pstats-panel">
                        <h4 className="pstats-panel-title" style={{ marginBottom: 14 }}>Líderes por métrica</h4>
                        <div className="pstats-list">
                            {leaders.map((l, i) => (
                                <div key={l.metric} className={`pstats-row${i === 0 ? ' top' : ''}`}>
                                    <Face user={l.user} getAvatarSrc={getAvatarSrc} />
                                    <div className="pstats-row-body">
                                        <div className="pstats-row-name">{l.user.username}</div>
                                        <div className="pstats-cap">{l.label}</div>
                                    </div>
                                    <span className={`pstats-row-value${i === 0 ? ' gold' : ''}`}>
                                        {l.value > 0 && l.value < 1 ? pct(l.value) : num(l.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pstats-panel" style={{ marginTop: 14 }}>
                        <div style={{ marginBottom: 14 }}>
                            <h4 className="pstats-panel-title">Por formato</h4>
                            <p className="pstats-cap">En BO1 acertar el ganador ya es clavar el marcador</p>
                        </div>
                        {byFormat.map(f => (
                            <BulletBar
                                key={f.format}
                                label={<span>{f.format}</span>}
                                value={f.accuracy}
                                max={1}
                                marker={f.partialAccuracy}
                                display={pct(f.accuracy)}
                                title={`${f.format} — ${pct(f.accuracy)} de acierto, ${pct(f.partialAccuracy)} parcial · ${f.matches} partidos`}
                            />
                        ))}
                        <div className="pstats-legend" style={{ marginTop: 12 }}>
                            <span className="pstats-legend-item"><i style={{ background: 'var(--s-accent)' }} />Acierto</span>
                            <span className="pstats-legend-item muted">
                                <i style={{ background: 'var(--s-ink-2)', width: 2, height: 12, borderRadius: 1 }} />Acierto parcial
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Ligas
// ═══════════════════════════════════════════════════════════════════════════

function TabLigas({ meta, year, getAvatarSrc, onPick }) {
    const leagues = (meta ? meta.leagues : []).filter(l => l.players > 0);
    if (!leagues.length) {
        return (
            <div className="pstats-panel">
                <EmptyState
                    title={`No hay competiciones en ${year}`}
                    detail="Esa temporada no tiene ninguna liga dada de alta todavía."
                />
            </div>
        );
    }

    const withRange = leagues.filter(l => l.accuracyRange);
    const from = withRange.length ? Math.max(0, Math.min(...withRange.map(l => l.accuracyRange.min)) - 0.05) : 0;
    const to = withRange.length ? Math.min(1, Math.max(...withRange.map(l => l.accuracyRange.max)) + 0.05) : 1;

    const columns = [
        { key: 'name', label: 'Competición', align: 'left', sortValue: (r) => r.name,
          render: (r) => (
              <button type="button" className="pstats-linkish" onClick={() => onPick(r.id)}>
                  {r.name}{r.countsForPachanga ? '' : ' ·'}
                  {!r.countsForPachanga && <span className="pstats-chip off" style={{ marginLeft: 6 }}>no puntúa</span>}
              </button>
          ) },
        { key: 'matches', label: 'Partidos' },
        { key: 'predictions', label: 'Preds' },
        { key: 'participation', label: 'Partic.', render: (r) => pct(r.participation) },
        { key: 'accuracy', label: 'Acierto', render: (r) => <span className="strong">{pct(r.accuracy)}</span> },
        { key: 'partialAccuracy', label: 'Parcial', render: (r) => pct(r.partialAccuracy) },
        { key: 'pointsAverage', label: 'Pts medios', render: (r) => dec(r.pointsAverage, 1) },
        { key: 'winner', label: 'Ganador', align: 'left', sortValue: (r) => (r.winner ? r.winner.username : ''),
          render: (r) => (r.winner
              ? <span className="pstats-cell-name"><Face user={r.winner} getAvatarSrc={getAvatarSrc} size={22} />{r.winner.username}</span>
              : '—') },
    ];

    return (
        <>
            <div className="pstats-panel">
                <div style={{ marginBottom: 14 }}>
                    <h4 className="pstats-panel-title">Las competiciones de {year}</h4>
                    <p className="pstats-cap">
                        Pincha una para meterte en su ámbito · las que no puntúan salen igual, marcadas
                    </p>
                </div>
                <SortableStatsTable columns={columns} rows={leagues} initialSort="matches" rowKey={(r) => r.id} />
            </div>

            {withRange.length > 0 && (
                <div className="pstats-panel" style={{ marginTop: 14 }}>
                    <div className="pstats-head" style={{ marginBottom: 14 }}>
                        <div>
                            <h4 className="pstats-panel-title">Qué competición se os da mejor</h4>
                            <p className="pstats-cap">Recorrido del acierto: del peor al mejor de cada liga</p>
                        </div>
                        <div className="pstats-legend">
                            <span className="pstats-legend-item"><i style={{ background: 'var(--s-accent)', borderRadius: '50%' }} />Media</span>
                            <span className="pstats-legend-item muted"><i style={{ background: 'var(--s-ink-3)', borderRadius: '50%' }} />Peor y mejor</span>
                        </div>
                    </div>
                    <DotPlot
                        rows={[...withRange]
                            .sort((a, b) => b.accuracy - a.accuracy)
                            .map(l => ({ label: l.name, min: l.accuracyRange.min, avg: l.accuracy, max: l.accuracyRange.max }))}
                        from={from}
                        to={to}
                        format={pct}
                    />
                    <p className="pstats-note">
                        Un recorrido corto es una competición en la que todos andáis parecido. Las que
                        abren distancia son donde se decide la Pachanga.
                    </p>
                </div>
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Ficha de jugador
// ═══════════════════════════════════════════════════════════════════════════

function TabJugador({ detail, detailFailed, players, focusId, scope, colorOf, getAvatarSrc, ctl, chart, onPick, onCompare, onScope }) {
    const picker = (
        <div className="pstats-filters" style={{ marginBottom: 14 }}>
            <span className="pstats-filter-label">Jugador</span>
            <Select
                size={ctl}
                aria-label="Jugador"
                style={{ minWidth: 170 }}
                value={focusId || null}
                onChange={onPick}
                options={conHuerfana(
                    players.map(p => ({ value: p.user.id, label: p.user.username })),
                    focusId
                )}
            />
        </div>
    );

    if (detailFailed) {
        const quien = (players.find(p => p.user.id === Number(focusId)) || {}).user;
        return (
            <>
                {picker}
                <div className="pstats-panel">
                    <EmptyState
                        title={`${quien ? quien.username : 'Ese jugador'} no tiene datos en este ámbito`}
                        detail={scope && scope.type === 'league'
                            ? 'No envió ninguna predicción en esta competición. En la Pachanga entera puede que sí aparezca.'
                            : 'No envió ninguna predicción en esta temporada.'}
                        actionLabel={scope && scope.type === 'league' ? 'Ver la Pachanga entera' : undefined}
                        onAction={scope && scope.type === 'league' ? onScope : undefined}
                    />
                </div>
            </>
        );
    }

    if (!detail || detail.kind !== 'jugador') {
        return <>{picker}<div className="pstats-panel"><Skeleton active paragraph={{ rows: 6 }} /></div></>;
    }

    const { player, rank, of, totals, average, byLeague, breakdown, weeks, teams } = detail;
    const c = colorOf(player.id);

    const origins = [
        { key: 'base', name: 'Ganador', color: chart.series[0], value: breakdown.base },
        { key: 'exact', name: 'Marcador', color: chart.series[1], value: breakdown.exact },
        { key: 'streak', name: 'Pleno', color: chart.series[2], value: breakdown.streak },
        { key: 'favorite', name: 'Favorito', color: chart.series[3], value: breakdown.favorite },
    ];
    const bestLeaguePoints = Math.max(1, ...byLeague.map(b => b.pointsOfficial));

    return (
        <>
            {picker}

            <div className="pstats-panel">
                <div className="pstats-head" style={{ marginBottom: 0 }}>
                    <div className="pstats-hero">
                        <Face user={player} getAvatarSrc={getAvatarSrc} size={62} />
                        <div>
                            <h3 className="pstats-hero-name">{player.username}</h3>
                            <div className="pstats-legend" style={{ marginTop: 6 }}>
                                <span className="pstats-chip gold">{rank}.º de {of}</span>
                                <span className="pstats-chip">{num(totals.pointsOfficial)} pts</span>
                                <span className="pstats-chip">{totals.predictions} de {totals.matchesAvailable} partidos</span>
                            </div>
                        </div>
                    </div>
                    <Button size={ctl} onClick={() => onCompare(player.id)}>
                        Comparar con otro
                    </Button>
                </div>
            </div>

            <div className="pstats-kpis" style={{ marginTop: 14 }}>
                <KpiTile hero label="Acierto" value={pct(totals.accuracy)}
                         delta={Number(((totals.accuracy - average.accuracy) * 100).toFixed(1))}
                         deltaLabel={`sobre la media (${pct(average.accuracy)})`} />
                <KpiTile label="Acierto parcial" value={pct(totals.partialAccuracy)}
                         delta={Number(((totals.partialAccuracy - average.partialAccuracy) * 100).toFixed(1))}
                         deltaLabel={`sobre la media (${pct(average.partialAccuracy)})`} />
                <KpiTile label="Puntos por predicción" value={dec(totals.pointsPerPrediction)}
                         delta={Number((totals.pointsPerPrediction - average.pointsPerPrediction).toFixed(2))}
                         deltaLabel={`sobre la media (${dec(average.pointsPerPrediction)})`} />
                <KpiTile label="Participación" value={pct(totals.participation)}
                         delta={Number(((totals.participation - average.participation) * 100).toFixed(1))}
                         deltaLabel={`sobre la media (${pct(average.participation)})`} />
            </div>

            <div className="pstats-panel-grid two">
                <div className="pstats-panel">
                    <div style={{ marginBottom: 14 }}>
                        <h4 className="pstats-panel-title">Rendimiento por competición</h4>
                        <p className="pstats-cap">Puntos conseguidos y puesto en cada una</p>
                    </div>
                    {byLeague.map(b => (
                        <BulletBar
                            key={b.leagueId}
                            label={<span>{b.name || `Liga ${b.leagueId}`}</span>}
                            value={b.pointsOfficial}
                            max={bestLeaguePoints}
                            variant="con-puesto"
                            display={<>{num(b.pointsOfficial)}{b.rank && <span className={`pstats-chip${b.rank === 1 ? ' gold' : ''}`}>{b.rank}.º</span>}</>}
                            color={c.mark}
                            title={`${b.name} — ${b.pointsOfficial} pts`}
                        />
                    ))}

                    <hr style={{ border: 0, borderTop: '1px solid var(--s-line)', margin: '18px 0' }} />

                    <h4 className="pstats-panel-title" style={{ marginBottom: 10 }}>
                        Sus {num(totals.points)} puntos de predicción
                    </h4>
                    <StackedPointsBar
                        label={<span>Origen</span>}
                        parts={origins}
                        total={num(totals.points)}
                    />
                    <div className="pstats-legend" style={{ marginTop: 10 }}>
                        {origins.map(o => (
                            <span key={o.key} className="pstats-legend-item">
                                <i style={{ background: o.color }} />{o.name} · {o.value}
                            </span>
                        ))}
                    </div>
                    {breakdown.manual !== 0 && (
                        <p className="pstats-note">
                            Además, <b>{signed(breakdown.manual, 0)} pts</b> añadidos a mano al cerrar las
                            ligas —los de dónde quedó su equipo favorito— que no salen de ninguna
                            predicción y por eso van fuera de la barra.
                        </p>
                    )}
                </div>

                <div>
                    {(teams.best || teams.worst) && (
                        <div className="pstats-panel">
                            <div style={{ marginBottom: 14 }}>
                                <h4 className="pstats-panel-title">Equipos</h4>
                                <p className="pstats-cap">Acierto parcial cuando ese equipo juega · mínimo 4 partidos</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {teams.best && (
                                    <div className="pstats-moment" style={{ '--m-mark': chart.series[3], '--m-text': chart.text[3] }}>
                                        <div className="pstats-moment-kind">Se le da bien</div>
                                        <div className="pstats-moment-main">{teams.best.name} · {teams.best.correct} de {teams.best.appearances}</div>
                                        <div className="pstats-moment-foot">{pct(teams.best.accuracy)} de acierto parcial</div>
                                    </div>
                                )}
                                {teams.worst && (
                                    <div className="pstats-moment" style={{ '--m-mark': chart.series[4], '--m-text': chart.text[4] }}>
                                        <div className="pstats-moment-kind">Su bestia negra</div>
                                        <div className="pstats-moment-main">{teams.worst.name} · {teams.worst.correct} de {teams.worst.appearances}</div>
                                        <div className="pstats-moment-foot">{pct(teams.worst.accuracy)} de acierto parcial</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {weeks.length > 0 && (
                        <div className="pstats-panel" style={{ marginTop: 14 }}>
                            <div style={{ marginBottom: 14 }}>
                                <h4 className="pstats-panel-title">Aciertos semana a semana</h4>
                                <p className="pstats-cap">Ganador y marcador, por competición y jornada</p>
                            </div>
                            <Heatmap rows={weeks} metric="exactScores" metricName="aciertos" />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Comparar
// ═══════════════════════════════════════════════════════════════════════════

function TabComparar({ detail, detailFailed, players, aId, bId, scope, allIds, themeName, getAvatarSrc, ctl, onPick, onScope }) {
    const pickers = (which, value) => (
        <Select
            size={ctl}
            aria-label={which === 'a' ? 'Primer jugador' : 'Segundo jugador'}
            style={{ minWidth: 150 }}
            value={value || null}
            onChange={(v) => onPick(which, v)}
            options={conHuerfana(
                players.map(p => ({ value: p.user.id, label: p.user.username })),
                value
            )}
        />
    );

    if (aId === bId) {
        return (
            <div className="pstats-panel">
                <div className="pstats-vs" style={{ marginBottom: 18 }}>
                    <div className="pstats-vs-side">{pickers('a', aId)}</div>
                    <span className="pstats-vs-mid">VS</span>
                    <div className="pstats-vs-side right">{pickers('b', bId)}</div>
                </div>
                <div className="pstats-empty">Elige dos jugadores distintos.</div>
            </div>
        );
    }

    if (detailFailed) {
        return (
            <div className="pstats-panel">
                <div className="pstats-vs" style={{ marginBottom: 18 }}>
                    <div className="pstats-vs-side">{pickers('a', aId)}</div>
                    <span className="pstats-vs-mid">VS</span>
                    <div className="pstats-vs-side right">{pickers('b', bId)}</div>
                </div>
                <EmptyState
                    title="Uno de los dos no tiene datos en este ámbito"
                    detail={scope && scope.type === 'league'
                        ? 'Alguno no votó en esta competición. En la Pachanga entera es probable que coincidáis.'
                        : 'Alguno no votó en esta temporada. Prueba con otra o con otro jugador.'}
                    actionLabel={scope && scope.type === 'league' ? 'Ver la Pachanga entera' : undefined}
                    onAction={scope && scope.type === 'league' ? onScope : undefined}
                />
            </div>
        );
    }

    if (!detail || detail.kind !== 'comparar') {
        return <div className="pstats-panel"><Skeleton active paragraph={{ rows: 6 }} /></div>;
    }

    const { a, b, headToHead, byLeague, divergent } = detail;
    const pair = distinctColorsFor([a.user.id, b.user.id], allIds, themeName);
    const ca = pair[a.user.id];
    const cb = pair[b.user.id];

    const metrics = [
        { label: 'Acierto', a: a.accuracy, b: b.accuracy, format: pct },
        { label: 'Parcial', a: a.partialAccuracy, b: b.partialAccuracy, format: pct },
        { label: 'Pts / pred', a: a.pointsPerPrediction, b: b.pointsPerPrediction, format: (v) => dec(v) },
        { label: 'Mejor pleno', a: a.bestRun, b: b.bestRun, format: num },
        { label: 'Plenos', a: a.plenos, b: b.plenos, format: num },
        { label: 'Bonus favorito', a: a.pointsFavorite, b: b.pointsFavorite, format: num },
        { label: 'Particip.', a: a.participation, b: b.participation, format: pct },
    ];

    return (
        <>
            <div className="pstats-panel">
                <div className="pstats-vs" style={{ marginBottom: 18 }}>
                    <div className="pstats-vs-side">
                        <Face user={a.user} getAvatarSrc={getAvatarSrc} size={48} />
                        <div>
                            <div className="pstats-vs-name">{a.user.username}</div>
                            <div className="pstats-vs-meta">{a.rank}.º · {num(a.pointsOfficial)} pts</div>
                        </div>
                        {pickers('a', aId)}
                    </div>
                    <span className="pstats-vs-mid">VS</span>
                    <div className="pstats-vs-side right">
                        <Face user={b.user} getAvatarSrc={getAvatarSrc} size={48} />
                        <div style={{ textAlign: 'right' }}>
                            <div className="pstats-vs-name">{b.user.username}</div>
                            <div className="pstats-vs-meta">{b.rank}.º · {num(b.pointsOfficial)} pts</div>
                        </div>
                        {pickers('b', bId)}
                    </div>
                </div>

                {/* Sin columnas fijas en línea: un estilo así gana a la media query y dejaba
                    los tres recuadros de 100 px en un móvil, con «39 — 32» partido en tres
                    líneas. El número de columnas lo decide .pstats-kpis.tres desde el CSS. */}
                <div className="pstats-kpis tres">
                    <KpiTile label="Partidos en común" value={num(headToHead.together)}
                             foot="ambos enviasteis predicción" />
                    <KpiTile hero label="Duelo directo" value={`${headToHead.aBetter} – ${headToHead.bBetter}`}
                             foot={`${headToHead.draws} empates`} />
                    <KpiTile label="Coincidencia de voto" value={pct(headToHead.agreement)}
                             foot={`${headToHead.sameVote} de ${headToHead.together}`} />
                </div>
            </div>

            <div className="pstats-panel-grid two">
                <div className="pstats-panel">
                    <div style={{ marginBottom: 14 }}>
                        <h4 className="pstats-panel-title">Métrica a métrica</h4>
                        <p className="pstats-cap">▲ marca quién gana cada una · los números llevan la magnitud</p>
                    </div>
                    {metrics.map(m => (
                        <CompareRow key={m.label} label={m.label} a={m.a} b={m.b}
                                    colorA={ca.mark} colorB={cb.mark} format={m.format} />
                    ))}

                    {byLeague.length > 0 && (
                        <>
                            <hr style={{ border: 0, borderTop: '1px solid var(--s-line)', margin: '18px 0' }} />
                            <h4 className="pstats-panel-title" style={{ marginBottom: 10 }}>Competición a competición</h4>
                            {byLeague.map(l => (
                                <CompareRow key={l.leagueId} label={l.name.slice(0, 14)} a={l.a} b={l.b}
                                            colorA={ca.mark} colorB={cb.mark} format={num} />
                            ))}
                        </>
                    )}
                </div>

                <div className="pstats-panel">
                    <div style={{ marginBottom: 14 }}>
                        <h4 className="pstats-panel-title">Los partidos que os separaron</h4>
                        <p className="pstats-cap">Votasteis distinto · mayor diferencia de puntos</p>
                    </div>
                    {headToHead.together === 0 ? (
                        <EmptyState
                            title="No coincidisteis en ningún partido"
                            detail="No hay ni un partido que hayáis votado los dos, así que no hay duelo que contar."
                        />
                    ) : divergent.length === 0 ? (
                        <EmptyState
                            title="Votasteis igual en todo"
                            detail={`En los ${headToHead.together} partidos que compartisteis pusisteis el mismo ganador siempre. O pensáis parecido, o os copiáis.`}
                        />
                    ) : (
                        <div className="pstats-tablewrap">
                            <table className="pstats-table" style={{ minWidth: 0 }}>
                                <thead>
                                    <tr>
                                        <th scope="col" className="left">Partido</th>
                                        <th scope="col" className="left">Liga</th>
                                        <th scope="col">{a.user.username}</th>
                                        <th scope="col">{b.user.username}</th>
                                        <th scope="col">Dif.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {divergent.map(d => (
                                        <tr key={d.matchId}>
                                            <td className="left strong">
                                                {d.teams.length ? d.teams.join(' vs ') : `Partido ${d.matchId}`}
                                                {d.result ? ` ${d.result}` : ''}
                                            </td>
                                            <td className="left">{d.league.slice(0, 16)}</td>
                                            <td>{d.aPoints}</td>
                                            <td>{d.bPoints}</td>
                                            <td style={{ color: d.diff > 0 ? ca.text : cb.text, fontWeight: 800 }}>
                                                {d.diff > 0 ? `+${d.diff}` : d.diff}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
