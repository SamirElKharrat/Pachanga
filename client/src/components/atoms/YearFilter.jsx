import React, { useMemo } from 'react';

/**
 * YearFilter – Reusable year-pill filter bar.
 *
 * Props:
 *   leagues        – Array of league objects (each must have `start_date`)
 *   selectedYear   – Currently active year (number) or null for "All"
 *   onYearChange   – Callback receiving the new year (number | null)
 */
const PILL_BASE = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: '6px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
};

const PILL_INACTIVE = {
    ...PILL_BASE,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.7)',
};

const PILL_ACTIVE = {
    ...PILL_BASE,
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: '1px solid #60a5fa',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
};

const LABEL_STYLE = {
    display: 'block',
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'rgba(255,255,255,0.5)',
};

const CONTAINER_STYLE = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
};

export default function YearFilter({ leagues = [], selectedYear, onYearChange }) {
    const years = useMemo(() => {
        const set = new Set();
        leagues.forEach(l => {
            if (l.start_date) {
                set.add(new Date(l.start_date).getFullYear());
            }
        });
        return Array.from(set).sort((a, b) => b - a); // newest first
    }, [leagues]);

    // Don't render anything if there are no years
    if (years.length === 0) return null;

    const handleClick = (year) => {
        onYearChange(year);
    };

    return (
        <div>
            <span style={LABEL_STYLE}>Año</span>
            <div style={CONTAINER_STYLE}>
                {/* "All" pill */}
                <div
                    style={selectedYear === null ? PILL_ACTIVE : PILL_INACTIVE}
                    onClick={() => handleClick(null)}
                    onMouseEnter={e => {
                        if (selectedYear !== null) {
                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                            e.currentTarget.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.2)';
                            e.currentTarget.style.color = '#fff';
                        }
                    }}
                    onMouseLeave={e => {
                        if (selectedYear !== null) {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                        }
                    }}
                >
                    Todas
                </div>

                {/* Year pills */}
                {years.map(year => (
                    <div
                        key={year}
                        style={selectedYear === year ? PILL_ACTIVE : PILL_INACTIVE}
                        onClick={() => handleClick(year)}
                        onMouseEnter={e => {
                            if (selectedYear !== year) {
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                e.currentTarget.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.2)';
                                e.currentTarget.style.color = '#fff';
                            }
                        }}
                        onMouseLeave={e => {
                            if (selectedYear !== year) {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                            }
                        }}
                    >
                        {year}
                    </div>
                ))}
            </div>
        </div>
    );
}
