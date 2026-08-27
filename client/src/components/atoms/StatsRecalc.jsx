import React, { useEffect, useState } from 'react';
import { Button, Select, Table, Typography, Alert, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { API } from '../../services/api';

const { Text } = Typography;

/**
 * Rehacer las estadísticas de una temporada desde el panel.
 *
 * Existe para cuando algo se descuadre y haya que cuadrarlo sin entrar por SSH. Es
 * seguro tocarlo todas las veces que haga falta: el recálculo lee las predicciones y
 * los resultados y reescribe solo las tablas de estadísticas, así que ni los puntos de
 * cada uno ni la clasificación se mueven — incluidos los que añades a mano al terminar
 * una liga, que el recálculo mide pero nunca calcula.
 */
function StatsRecalc() {
    const [years, setYears] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await API.get('/stats/leagues');
                if (cancelled) return;
                const list = r.years || [];
                setYears(list);
                if (list.length && !list.includes(year)) setYear(list[0]);
            } catch (error) {
                console.error('No se pudieron cargar las temporadas:', error);
            }
        })();
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const run = async () => {
        setRunning(true);
        setResult(null);
        try {
            const r = await API.post('/stats/recompute', { year });
            setResult(r);
            message.success(`Estadísticas de ${year} rehechas en ${r.seconds} s`);
        } catch (error) {
            const detalle = error.response && error.response.data && error.response.data.error;
            message.error(detalle || 'No se pudo recalcular');
        } finally {
            setRunning(false);
        }
    };

    return (
        <div style={{ padding: '4px 8px 16px', maxWidth: 720 }}>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 18 }}
                message="No mueve ningún punto"
                description={
                    'Rehace solo las tablas de estadísticas a partir de las predicciones y los '
                    + 'resultados que ya hay. Ni la clasificación ni los puntos de nadie cambian, '
                    + 'los de equipo favorito incluidos. Se puede lanzar las veces que haga falta.'
                }
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text strong>Temporada</Text>
                <Select
                    value={year}
                    onChange={setYear}
                    style={{ width: 120 }}
                    disabled={running}
                    options={(years.length ? years : [year]).map(y => ({ value: y, label: String(y) }))}
                />
                <Button type="primary" icon={<ReloadOutlined />} loading={running} onClick={run}>
                    {running ? 'Recalculando…' : 'Recalcular estadísticas'}
                </Button>
            </div>

            {result && (
                <div style={{ marginTop: 20 }}>
                    <Text type="secondary">
                        {result.leagues.length} competiciones en {result.seconds} s
                    </Text>
                    <Table
                        style={{ marginTop: 10 }}
                        size="small"
                        pagination={false}
                        rowKey={(r) => r.leagueId}
                        dataSource={result.leagues}
                        columns={[
                            { title: 'Competición', dataIndex: 'name' },
                            { title: 'Jornadas', dataIndex: 'weeks', align: 'right', width: 100 },
                            { title: 'Jugadores', dataIndex: 'players', align: 'right', width: 100 },
                        ]}
                    />
                </div>
            )}
        </div>
    );
}

export default StatsRecalc;
