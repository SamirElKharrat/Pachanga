import React from 'react';
import { Modal, Typography, Tag, Flex, Skeleton, Empty, theme } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * Cómo se pinta cada clase de cambio.
 *
 * Los tres colores son los semánticos de la casa —el verde del acierto, el ámbar del
 * aviso, el azul del acento— y no una paleta nueva: la etiqueta tiene que significar
 * lo mismo aquí que en el resto de la web.
 */
const KINDS = {
    new:    { label: 'Nuevo',   color: 'var(--success)',      bg: 'rgba(var(--success-rgb), 0.10)' },
    fix:    { label: 'Arreglo', color: 'var(--pred-acierto)', bg: 'rgba(var(--pred-acierto-rgb), 0.10)' },
    change: { label: 'Cambio',  color: 'var(--accent)',       bg: 'rgba(var(--accent-rgb), 0.10)' },
};

/**
 * Agrupa las líneas por versión, conservando el orden en que llegan.
 *
 * El servidor ya las manda ordenadas —lo más reciente primero, y dentro de una
 * versión el orden en que se escribieron—, así que aquí no se reordena nada: hacerlo
 * sería tener dos criterios que se pueden contradecir.
 *
 * @param {Array} entries
 * @returns {Array<{version: string, date: string, changes: Array}>}
 */
const groupByVersion = (entries) => {
    const out = [];
    // No basta con el valor por defecto del parámetro: ese solo salta con `undefined`.
    // Si la petición trae otra cosa —un objeto de error, null—, iterarla tumbaría la
    // página entera por no poder pintar una ventana de novedades.
    if (!Array.isArray(entries)) return out;

    for (const entry of entries) {
        let group = out.find(g => g.version === entry.version);
        if (!group) {
            group = { version: entry.version, date: entry.release_date, changes: [] };
            out.push(group);
        }
        group.changes.push(entry);
    }
    return out;
};

/** «agosto 2026». En minúscula, que es como se escribe en castellano. */
const monthYear = (value) => {
    const d = new Date(value);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
};

/**
 * Las novedades de la web.
 *
 * No sabe nada de versiones por su cuenta: pinta lo que le den. Lo que se enseña se
 * escribe desde el panel de administración, en Novedades.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Array} props.entries - Las líneas, ya ordenadas por el servidor.
 * @param {boolean} props.loading
 */
export default function ChangelogModal({ open, onClose, entries = [], loading = false }) {
    const { token } = theme.useToken();
    const releases = groupByVersion(entries);

    return (
        <Modal
            title={
                <Flex align="center" gap={9}>
                    <FileTextOutlined style={{ color: 'var(--accent)' }} />
                    <span>Novedades</span>
                </Flex>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={520}
            centered
            styles={{ body: { maxHeight: '60vh', overflowY: 'auto', paddingTop: 4 } }}
        >
            <Skeleton loading={loading} active>
                {releases.length === 0 ? (
                    <Empty description="Todavía no hay novedades que contar." />
                ) : releases.map((release, i) => (
                    <div
                        key={release.version}
                        style={{
                            padding: i === 0 ? '12px 0 18px' : '18px 0',
                            borderTop: i === 0 ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                        }}
                    >
                        <Flex align="baseline" gap={10} style={{ marginBottom: 12 }}>
                            <Title level={5} style={{ margin: 0, color: 'var(--accent)' }}>
                                {release.version}
                            </Title>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {i === 0 ? 'versión actual' : monthYear(release.date)}
                            </Text>
                        </Flex>

                        <Flex vertical gap={9}>
                            {release.changes.map(change => {
                                const kind = KINDS[change.kind] ?? KINDS.change;
                                return (
                                    <Flex key={change.id} align="flex-start" gap={9}>
                                        <Tag
                                            style={{
                                                margin: 0,
                                                marginTop: 1,
                                                flex: '0 0 auto',
                                                fontSize: 10,
                                                lineHeight: '18px',
                                                color: kind.color,
                                                background: kind.bg,
                                                borderColor: kind.color,
                                            }}
                                        >
                                            {kind.label}
                                        </Tag>
                                        <Text style={{ fontSize: 13, lineHeight: 1.5 }}>{change.text}</Text>
                                    </Flex>
                                );
                            })}
                        </Flex>
                    </div>
                ))}
            </Skeleton>
        </Modal>
    );
}
