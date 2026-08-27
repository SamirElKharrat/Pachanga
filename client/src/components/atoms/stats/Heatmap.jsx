import React from 'react';

/**
 * Mapa de aciertos por competición y jornada.
 *
 * Distingue tres estados y no dos, que es el error clásico de estos mapas:
 * «no había partidos» (hueco con contorno) no es lo mismo que «jugó y no acertó
 * ninguno» (celda gris).
 *
 * La escala es de un solo tono, de claro a oscuro, porque lo que codifica es una
 * magnitud. Un arcoíris aquí no significaría nada.
 *
 * @param {Object} props
 * @param {Array<{leagueId: number, name: string, weeks: Array}>} props.rows - Salida de /stats/player.
 * @param {string} [props.metric='exactScores'] - Qué campo pinta la intensidad.
 * @param {string} [props.metricName='aciertos']
 */
function Heatmap({ rows, metric = 'exactScores', metricName = 'aciertos' }) {
    if (!rows || rows.length === 0) return null;

    // Todas las jornadas que aparecen en cualquier competición, para que la rejilla
    // quede alineada aunque unas duren más que otras.
    const weeks = [...new Set(rows.flatMap(r => r.weeks.map(w => w.week)))].sort((a, b) => a - b);
    const top = Math.max(1, ...rows.flatMap(r => r.weeks.map(w => w[metric] || 0)));

    // Cinco pasos: 0 y cuatro intensidades. Más de eso y los tonos contiguos se
    // confunden entre sí.
    const step = (value) => (value <= 0 ? 0 : Math.min(4, Math.ceil((value / top) * 4)));

    return (
        <div>
            <div
                className="pstats-heat"
                style={{ gridTemplateColumns: `72px repeat(${weeks.length}, minmax(0, 1fr))` }}
            >
                <span />
                {weeks.map(w => <span key={`h${w}`} className="pstats-heat-col">{w}</span>)}

                {rows.map(row => (
                    <React.Fragment key={row.leagueId}>
                        <span className="pstats-heat-label" title={row.name}>{row.name}</span>
                        {weeks.map(w => {
                            const cell = row.weeks.find(x => x.week === w);
                            if (!cell || cell.matchesAvailable === 0) {
                                return <i key={`${row.leagueId}-${w}`} className="na" title={`${row.name} · J${w} — sin partidos`} />;
                            }
                            const value = cell[metric] || 0;
                            return (
                                <i
                                    key={`${row.leagueId}-${w}`}
                                    data-v={step(value)}
                                    title={
                                        `${row.name} · J${w} — ${value} ${metricName} ` +
                                        `de ${cell.predictions} predicciones sobre ${cell.matchesAvailable} partidos`
                                    }
                                />
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            <div className="pstats-heat-legend">
                <span>0</span>
                <i data-v="0" /><i data-v="1" /><i data-v="2" /><i data-v="3" /><i data-v="4" />
                <span>{top}</span>
                <span className="pstats-heat-sep">
                    <i className="na" /> sin partidos
                </span>
            </div>
        </div>
    );
}

export default Heatmap;
