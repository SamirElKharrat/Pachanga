import React, { useMemo, useState } from 'react';

/**
 * La tabla de jugadores con todas las métricas.
 *
 * Además de tabla es la versión accesible de las gráficas: cualquier número que se
 * dibuje arriba se puede leer aquí, que es lo que salva a quien no distinga los
 * colores. Por eso vale la pena que esté completa aunque ocupe.
 *
 * @param {Object} props
 * @param {Array<Object>} props.columns - {key, label, align, render, sortable, title}
 * @param {Array<Object>} props.rows
 * @param {string} [props.initialSort] - Columna por la que arranca ordenada.
 * @param {Function} props.rowKey
 */
function SortableStatsTable({ columns, rows, initialSort, rowKey }) {
    const [sort, setSort] = useState({ key: initialSort || columns[0].key, desc: true });

    const sorted = useMemo(() => {
        const column = columns.find(c => c.key === sort.key);
        if (!column) return rows;
        const value = column.sortValue || ((r) => r[sort.key]);

        return [...rows].sort((x, y) => {
            const a = value(x);
            const b = value(y);
            if (typeof a === 'string' || typeof b === 'string') {
                return sort.desc
                    ? String(b).localeCompare(String(a), 'es')
                    : String(a).localeCompare(String(b), 'es');
            }
            return sort.desc ? (b || 0) - (a || 0) : (a || 0) - (b || 0);
        });
    }, [rows, sort, columns]);

    const toggle = (key) => setSort(s => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }));

    return (
        <>
            {/* En un móvil se ven cuatro de once columnas y nada indica que haya más. */}
            <p className="pstats-swipe" aria-hidden="true">Desliza la tabla para ver el resto de columnas →</p>
            <div className="pstats-tablewrap" tabIndex={0} role="group" aria-label="Tabla desplazable">
            <table className="pstats-table">
                <thead>
                    <tr>
                        {columns.map(c => (
                            <th
                                key={c.key}
                                scope="col"
                                className={`${c.align === 'left' ? 'left' : ''}${c.sortable === false ? '' : ' sortable'}`}
                                title={c.title}
                                aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}
                                tabIndex={c.sortable === false ? undefined : 0}
                                onClick={c.sortable === false ? undefined : () => toggle(c.key)}
                                onKeyDown={c.sortable === false ? undefined : (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.key); }
                                }}
                            >
                                {c.label}
                                {sort.key === c.key && <span className="arrow">{sort.desc ? '▾' : '▴'}</span>}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((row, i) => (
                        <tr key={rowKey(row)}>
                            {columns.map(c => (
                                <td key={c.key} className={c.align === 'left' ? 'left' : ''}>
                                    {c.render ? c.render(row, i) : row[c.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </>
    );
}

export default SortableStatsTable;
