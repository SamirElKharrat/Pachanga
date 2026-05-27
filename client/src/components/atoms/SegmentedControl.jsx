import React from 'react';

/**
 * A sleek Segmented Control component (Option 1 design).
 * 
 * @param {Object[]} options - Array of options { value, label, logo (optional) }
 * @param {string|number} value - Currently selected value
 * @param {Function} onChange - Callback on change
 * @param {boolean} disabled - Whether the control is disabled/loading
 */
export default function SegmentedControl({ options, value, onChange, disabled }) {
    if (!options || options.length === 0) return null;

    return (
        <div 
            style={{
                display: 'inline-flex',
                background: '#1e293b',
                padding: 4,
                borderRadius: 12,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                overflowX: 'auto',
                maxWidth: '100%',
                opacity: disabled ? 0.5 : 1,
                pointerEvents: disabled ? 'none' : 'auto'
            }}
            className="segmented-control-hide-scroll"
        >
            <style>{`
                .segmented-control-hide-scroll::-webkit-scrollbar { display: none; }
            `}</style>
            
            {options.map((opt) => {
                const isActive = value === opt.value;
                return (
                    <div
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: isActive ? '#3b82f6' : 'transparent',
                            color: isActive ? '#ffffff' : '#94a3b8',
                            boxShadow: isActive ? '0 4px 6px rgba(59, 130, 246, 0.3)' : 'none',
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.color = '#e2e8f0';
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        {opt.logo && (
                            <div style={{
                                width: 20,
                                height: 20,
                                background: '#0f172a',
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 8,
                                fontWeight: 800,
                                overflow: 'hidden'
                            }}>
                                {typeof opt.logo === 'string' && opt.logo.startsWith('http') ? (
                                    <img src={opt.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    opt.logo
                                )}
                            </div>
                        )}
                        {opt.label}
                    </div>
                );
            })}
        </div>
    );
}
