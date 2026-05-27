import React, { useMemo } from 'react';

const LABEL_STYLE = {
    display: 'block',
    marginBottom: 8,
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.5)',
};

const WRAPPER_STYLE = {
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '10px',
    padding: '4px',
    gap: '4px',
    width: 'fit-content',
    maxWidth: '100%',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
};

/**
 * YearFilter – Reusable segmented control year filter bar.
 *
 * Props:
 *   leagues        – Array of league objects (each must have `start_date`)
 *   selectedYear   – Currently active year (number) or null for "All"
 *   onYearChange   – Callback receiving the new year (number | null)
 */
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

    const getItemStyle = (isActive) => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        padding: '6px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        border: 'none',
        background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
        color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
        boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.4)' : 'none',
        flexShrink: 0,
    });

    return (
        <div style={{ marginBottom: 16 }}>
            <span style={LABEL_STYLE}>Año</span>
            <div style={WRAPPER_STYLE} className="hide-scrollbar">
                {/* "All" pill */}
                <div
                    style={getItemStyle(selectedYear === null)}
                    onClick={() => handleClick(null)}
                    onMouseEnter={e => {
                        if (selectedYear !== null) {
                            e.currentTarget.style.color = '#fff';
                        }
                    }}
                    onMouseLeave={e => {
                        if (selectedYear !== null) {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                        }
                    }}
                >
                    Todas
                </div>

                {/* Year pills */}
                {years.map(year => (
                    <div
                        key={year}
                        style={getItemStyle(selectedYear === year)}
                        onClick={() => handleClick(year)}
                        onMouseEnter={e => {
                            if (selectedYear !== year) {
                                e.currentTarget.style.color = '#fff';
                            }
                        }}
                        onMouseLeave={e => {
                            if (selectedYear !== year) {
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
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
