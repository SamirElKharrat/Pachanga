import React, { useMemo } from 'react';

/** Paso de eje "bonito": 1, 2 o 5 por la potencia de 10 que toque. */
const niceStep = (rough) => {
    if (!(rough > 0)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const n = rough / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
};

/**
 * Gráfica de líneas en SVG, sin librería.
 *
 * Admite valores negativos, que es lo que permite dibujar distancias a una media:
 * cuando el dominio cruza el cero, la línea del cero se marca como eje.
 *
 * Tres series como mucho, y a propósito: con más, hay pares de colores que un
 * daltónico no separa cuando las líneas se cruzan. Cada serie lleva además su valor
 * final escrito al lado, así que el color nunca es lo único que identifica una línea.
 *
 * @param {Object} props
 * @param {Array<string>} props.labels - Etiquetas del eje X.
 * @param {Array<{name: string, values: number[], mark: string, text: string}>} props.series
 * @param {boolean} [props.signed] - Escribe el signo en las etiquetas y las marcas del eje.
 * @param {string} [props.baselineLabel] - Qué es la línea del cero ('media', por ejemplo).
 * @param {string} [props.ariaLabel] - Qué cuenta la gráfica, para quien no la ve.
 * @param {boolean} [props.wide] - Proporción apaisada, para paneles a todo lo ancho.
 */
function LineChart({ labels = [], series = [], signed = false, baselineLabel, ariaLabel, wide = false }) {
    // Un panel ancho estira el viewBox y la gráfica acaba midiendo más de alto que de
    // ancho. Con la proporción apaisada se queda en su sitio.
    const W = wide ? 900 : 470;
    const H = wide ? 260 : 234;
    const PAD = { left: 38, right: 62, top: 12, bottom: 34 };

    const chart = useMemo(() => {
        const all = series.map(s => s.values).flat();
        if (!all.length || !labels.length) return null;

        const step = niceStep((Math.max(...all, 0) - Math.min(...all, 0)) / 4);
        const lo = Math.floor(Math.min(...all, 0) / step) * step;
        const hi = Math.ceil(Math.max(...all, 0) / step) * step;
        const span = hi - lo || 1;

        const x0 = PAD.left;
        const x1 = W - PAD.right;
        const y0 = H - PAD.bottom;
        const y1 = PAD.top;

        const xOf = (i) => (labels.length === 1 ? x0 : x0 + (i * (x1 - x0)) / (labels.length - 1));
        const yOf = (v) => y0 - ((v - lo) / span) * (y0 - y1);
        const path = (values) => values.map((v, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ');

        const ticks = [];
        for (let v = lo; v <= hi + step / 2; v += step) ticks.push({ value: Math.round(v), y: yOf(v) });

        return { lo, hi, x0, x1, y0, xOf, yOf, path, ticks, every: Math.max(1, Math.ceil(labels.length / 6)) };
    }, [labels, series]);

    if (!chart) return null;

    const fmt = (v) => (signed && v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`);

    // Las etiquetas finales se reparten en vertical para que no se solapen.
    const ordered = [...series]
        .map(s => ({ ...s, last: s.values[s.values.length - 1] }))
        .sort((a, b) => b.last - a.last);

    return (
        <svg className="pstats-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
            {chart.ticks.map((t) => {
                const isZero = t.value === 0;
                return (
                    <g key={`t${t.value}`}>
                        <line
                            className={isZero ? 'axis' : 'grid'}
                            x1={chart.x0} y1={t.y} x2={chart.x1} y2={t.y}
                            strokeWidth={isZero ? 1.5 : 1}
                        />
                        <text className="tick" x={chart.x0 - 6} y={t.y + 3.5} textAnchor="end">{fmt(t.value)}</text>
                        {isZero && baselineLabel && (
                            <text x={chart.x0 - 6} y={t.y + 15} textAnchor="end">{baselineLabel}</text>
                        )}
                    </g>
                );
            })}

            {labels.map((label, i) => (
                (i % chart.every === 0 || i === labels.length - 1) && (
                    <text
                        key={`x${i}`}
                        x={chart.xOf(i)}
                        y={H - PAD.bottom + 17}
                        textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
                    >
                        {label.length > 11 ? label.slice(0, 10) + '…' : label}
                    </text>
                )
            ))}

            {series.map((s) => (
                <g key={s.name}>
                    <title>{`${s.name} — ${s.values.map(fmt).join(' · ')}`}</title>
                    <path className="line" d={chart.path(s.values)} stroke={s.mark} />
                    <circle
                        className="dot"
                        cx={chart.xOf(s.values.length - 1)}
                        cy={chart.yOf(s.values[s.values.length - 1])}
                        r="3.5"
                        fill={s.mark}
                    />
                </g>
            ))}

            {ordered.map((s, rank) => (
                <text
                    key={`l${s.name}`}
                    className="direct"
                    x={chart.x1 + 9}
                    y={PAD.top + 12 + rank * 13}
                    fill={s.text}
                >
                    {fmt(s.last)}
                </text>
            ))}
        </svg>
    );
}

export default LineChart;
