import React from 'react';

/**
 * Recorrido de un valor entre el peor y el mejor, con la media marcada.
 *
 * Sirve para comparar competiciones: no solo dónde está la media de cada una, sino
 * cuánto separa a la gente. Una liga con recorrido corto es una liga en la que todos
 * andáis parecido.
 *
 * @param {Object} props
 * @param {Array<{label: string, min: number, avg: number, max: number, note: string}>} props.rows
 * @param {number} props.from - Extremo izquierdo de la escala.
 * @param {number} props.to   - Extremo derecho.
 * @param {Function} [props.format] - Cómo se escribe un valor.
 */
function DotPlot({ rows, from, to, format = (v) => v }) {
    if (!rows || rows.length === 0) return null;
    const span = (to - from) || 1;
    const at = (v) => `${Math.max(0, Math.min(100, ((v - from) / span) * 100))}%`;

    return (
        <div>
            {rows.map(r => (
                <div className="pstats-dotrow" key={r.label}>
                    <span className="pstats-bullet-label" title={r.label}>
                        <span>{r.label}</span>
                    </span>
                    <div className="pstats-dottrack">
                        <span
                            className="pstats-dotspan"
                            style={{ left: at(r.min), width: `calc(${at(r.max)} - ${at(r.min)})` }}
                        />
                        <span className="pstats-dot" style={{ left: at(r.min) }} title={`peor: ${format(r.min)}`} />
                        <span className="pstats-dot avg" style={{ left: at(r.avg) }} title={`media: ${format(r.avg)}`} />
                        <span className="pstats-dot" style={{ left: at(r.max) }} title={`mejor: ${format(r.max)}`} />
                    </div>
                    <span className="pstats-dotrange">
                        {format(r.min)} – <b>{format(r.avg)}</b> – {format(r.max)}
                    </span>
                </div>
            ))}
            <div className="pstats-dotscale">
                <span>{format(from)}</span>
                <span>{format((from + to) / 2)}</span>
                <span>{format(to)}</span>
            </div>
        </div>
    );
}

export default DotPlot;
