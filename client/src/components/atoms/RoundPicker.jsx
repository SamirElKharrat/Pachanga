import React from 'react';
import { Col, Flex, Skeleton, Typography } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, FlagOutlined } from '@ant-design/icons';
import SegmentedControl from './SegmentedControl';
import { stagesOf, roundForStage } from '../../utils/rounds';

const { Text } = Typography;

const LABEL_STYLE = {
    display: 'block', fontSize: 11, textTransform: 'uppercase',
    color: 'rgba(var(--tint),0.5)', letterSpacing: '0.08em',
};

/**
 * El icono pequeño del estado de una jornada, dentro de su opción.
 *
 * En juego lleva un punto verde y programada un reloj apagado. Una resuelta va sin
 * icono: es lo normal en una jornada pasada y no hace falta marcarlo. No hay
 * «cerrada»: por ahora las jornadas no tienen cierre.
 */
function RoundStatusIcon({ status }) {
    if (status === 'settled') return null;
    if (status === 'live') {
        return (
            <span
                aria-label="En juego"
                role="img"
                style={{
                    width: 6, height: 6, borderRadius: '50%', flex: '0 0 6px', display: 'inline-block',
                    background: 'var(--success)', boxShadow: '0 0 0 3px rgba(var(--success-rgb), 0.2)',
                }}
            />
        );
    }
    return <ClockCircleOutlined aria-label="Programada" style={{ color: 'var(--text-faint)', fontSize: 11 }} />;
}

/**
 * Los filtros de Fase y Jornada, para la tarjeta «Filtros de Competición».
 *
 * Sustituye al segmentado «Semana». Devuelve columnas sueltas porque va dentro del
 * `<Row>` de esa tarjeta, igual que los filtros de Año y Liga. La fase solo se
 * enseña si la liga tiene más de una: en una liga normal sería un control con una
 * única opción.
 *
 * El valor es el `id` de las jornadas de fetchLeagueRounds (su `order`).
 *
 * @param {Object} props
 * @param {Array<Object>} props.rounds - De utils/rounds.js, fetchLeagueRounds.
 * @param {number|null} props.value
 * @param {Function} props.onChange - Recibe el `id` de la jornada elegida.
 * @param {boolean} [props.loading]
 */
export default function RoundPicker({ rounds, value, onChange, loading = false }) {
    if (loading && rounds.length === 0) {
        return (
            <Col xs={24}>
                <Flex vertical gap={8}>
                    <Text strong style={LABEL_STYLE}><CalendarOutlined style={{ marginRight: 6 }} />Jornada</Text>
                    <Skeleton.Button active block style={{ height: 32 }} />
                </Flex>
            </Col>
        );
    }

    const stages = stagesOf(rounds);
    const selected = rounds.find(r => r.id === value);
    const stage = selected ? selected.stage : (stages[0] && stages[0].key);
    const inStage = rounds.filter(r => r.stage === stage);

    return (
        <>
            {stages.length > 1 && (
                <Col xs={24}>
                    <Flex vertical gap={8}>
                        <Text strong style={LABEL_STYLE}><FlagOutlined style={{ marginRight: 6 }} />Fase</Text>
                        <SegmentedControl
                            options={stages.map(s => ({ value: s.key, label: s.label }))}
                            value={stage}
                            onChange={(key) => {
                                const target = roundForStage(rounds, key);
                                if (target) onChange(target.id);
                            }}
                        />
                    </Flex>
                </Col>
            )}
            <Col xs={24}>
                <Flex vertical gap={8}>
                    <Text strong style={LABEL_STYLE}><CalendarOutlined style={{ marginRight: 6 }} />Jornada</Text>
                    <SegmentedControl
                        options={inStage.map(r => ({
                            value: r.id,
                            label: `${r.name}${r.current ? ' (Actual)' : ''}`,
                            icon: <RoundStatusIcon status={r.status} />,
                        }))}
                        value={value}
                        onChange={onChange}
                        disabled={loading}
                    />
                </Flex>
            </Col>
        </>
    );
}
