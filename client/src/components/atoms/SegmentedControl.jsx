import React, { useState, useEffect } from 'react';
import { Select, Avatar, Segmented, Space, Flex } from 'antd';

/**
 * A sleek Segmented Control component with responsive mobile fallback.
 * On mobile (<768px) it renders an Ant Design Select dropdown instead.
 * 
 * @param {Object[]} options - Array of options { value, label, logo (optional), badge (optional) }
 * @param {string|number} value - Currently selected value
 * @param {Function} onChange - Callback on change
 * @param {boolean} disabled - Whether the control is disabled/loading
 */
/**
 * El punto de aviso de una opción. Existe para que lo que vive detrás de una pestaña
 * no pase desapercibido: sin él, media liga no se enteraría de que hay preguntas.
 */
const Badge = () => (
    <span
        aria-hidden="true"
        style={{
            width: 6, height: 6, borderRadius: '50%', flex: '0 0 6px',
            background: 'var(--pred-acierto)',
            boxShadow: '0 0 0 3px rgba(var(--pred-acierto-rgb), 0.18)',
        }}
    />
);

export default function SegmentedControl({ options, value, onChange, disabled }) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    if (!options || options.length === 0) return null;

    // ── Mobile: Ant Design Select ───────────────────────────────────────────
    if (isMobile) {
        return (
            <Select
                style={{ width: '100%' }}
                value={value}
                onChange={onChange}
                disabled={disabled}
                options={options.map(opt => ({
                    label: (
                        <Space size={8}>
                            {opt.logo && typeof opt.logo === 'string' && opt.logo.startsWith('http') && (
                                <Avatar src={opt.logo} size={16} shape="square" style={{ background: 'transparent', borderRadius: 3 }} />
                            )}
                            <span>{opt.label}</span>
                            {opt.badge && <Badge />}
                        </Space>
                    ),
                    value: opt.value
                }))}
            />
        );
    }

    // ── Desktop: Ant Design Segmented ────────────────────────────────────────
    return (
        <Flex style={{ overflowX: 'auto', maxWidth: '100%', paddingBottom: 8 }}>
            <Segmented
                disabled={disabled}
                value={value}
                onChange={onChange}
                style={{ minWidth: 'max-content' }}
                options={options.map(opt => ({
                    label: (
                        <Space size={8} style={{ padding: '2px 6px' }}>
                            {opt.logo && typeof opt.logo === 'string' && opt.logo.startsWith('http') && (
                                <Avatar src={opt.logo} size={16} shape="square" style={{ background: 'transparent' }} />
                            )}
                            <span>{opt.label}</span>
                            {opt.badge && <Badge />}
                        </Space>
                    ),
                    value: opt.value
                }))}
            />
        </Flex>
    );
}
