import React, { useMemo } from 'react';
import { Select } from 'antd';

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
 * YearFilter – Reusable segmented control/premium select year filter bar.
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
            {/* CSS styles to toggle between select (mobile) and segmented (desktop) */}
            <style>{`
                .mobile-selectors {
                    display: none;
                }
                .desktop-selectors {
                    display: block;
                }
                @media (max-width: 576px) {
                    .mobile-selectors {
                        display: block;
                    }
                    .desktop-selectors {
                        display: none;
                    }
                }
                .premium-select .ant-select-selector {
                    background: rgba(0, 0, 0, 0.25) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    border-radius: 10px !important;
                    color: #fff !important;
                    height: 42px !important;
                    display: flex !important;
                    align-items: center !important;
                    padding: 0 12px !important;
                    transition: all 0.2s ease !important;
                }
                .premium-select:hover .ant-select-selector {
                    border-color: rgba(59, 130, 246, 0.5) !important;
                    box-shadow: 0 0 10px rgba(59, 130, 246, 0.2) !important;
                }
                .premium-select .ant-select-selection-item {
                    color: #fff !important;
                    font-weight: 600 !important;
                    font-size: 13px !important;
                }
                .premium-select .ant-select-arrow {
                    color: rgba(255, 255, 255, 0.4) !important;
                }
                .year-segmented-container::-webkit-scrollbar {
                    display: none;
                }
                .year-segmented-container {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            <span style={LABEL_STYLE}>Año</span>
            
            {/* Desktop View: Segmented Control */}
            <div className="desktop-selectors">
                <div style={WRAPPER_STYLE} className="year-segmented-container">
                    <div
                        className="year-segmented-item"
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

                    {years.map(year => (
                        <div
                            key={year}
                            className="year-segmented-item"
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

            {/* Mobile View: Premium Select */}
            <div className="mobile-selectors">
                <Select
                    className="premium-select"
                    style={{ width: '100%' }}
                    value={selectedYear}
                    onChange={handleClick}
                    placeholder="Elige un año"
                    options={[
                        { label: 'Todas las ligas (Todos los años)', value: null },
                        ...years.map(y => ({ label: `Año ${y}`, value: y }))
                    ]}
                />
            </div>
        </div>
    );
}
