import React, { useState, useEffect } from 'react';
import {
    Card, Row, Col, Button, Typography, Skeleton,
    Select, Space, Empty, Tag,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import PredictionForm from '../atoms/PredictionForm';
import PredictionTable from '../atoms/PredictionTable';
import ResultTable from '../atoms/ResultTable';
import { HistoryOutlined, FormOutlined, CalendarOutlined, TrophyOutlined } from '@ant-design/icons';
import { usePredictionData } from '../../hooks/usePredictionData';

const { Text } = Typography;

// Same helper as the hook — used here to pre-compute weeks for auto-selecting
const calculateWeeks = (startDateStr, endDateStr) => {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const weeks = [];
    let cur = new Date(startDate);
    const dow = cur.getDay();
    const shift = dow === 4 ? 0 : dow > 4 ? -(dow - 4) : -(dow + 3);
    cur.setDate(cur.getDate() + shift);

    let n = 1;
    while (cur <= endDate) {
        const end = new Date(cur);
        end.setDate(cur.getDate() + 6);
        weeks.push({ id: n, name: `Semana ${n}`, start: cur.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
        cur.setDate(cur.getDate() + 7);
        n++;
    }
    return weeks;
};

const Prediction = () => {
    const nav = useNavigate();

    const [selectedLeague, setSelectedLeague] = useState(null);
    const [selectedWeek, setSelectedWeek]     = useState(null);
    const [send, setSend] = useState(false);

    const {
        leagues,
        weeks,
        userPoints,
        currentMatches,
        hasPredicted,
        userCurrentPredictions,
        historyMatches,
        allResults,
        allUserPredictions,
        loading,
    } = usePredictionData(selectedLeague, selectedWeek);

    // ── Auto-select first league once leagues load ─────────────────────────────
    useEffect(() => {
        if (leagues.length > 0 && selectedLeague === null) {
            setSelectedLeague(leagues[0].id);
        }
    }, [leagues, selectedLeague]);

    // ── Auto-select current (last) week once league is known ───────────────────
    // We compute weeks inline from the selected league object so we don't have
    // to wait for Phase 2 of the hook (which needs selectedWeek to be set first).
    useEffect(() => {
        if (!selectedLeague || selectedWeek !== null) return;

        const liga = leagues.find(l => l.id === selectedLeague);
        if (!liga) return;

        const computed = calculateWeeks(liga.start_date, liga.end_date);
        if (computed.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const currentWeek = computed.find(w => todayStr >= w.start && todayStr <= w.end);
            setSelectedWeek(currentWeek ? currentWeek.id : computed[0].id);
        }
    }, [selectedLeague, leagues, selectedWeek]);

    // ── Reset week when league changes ─────────────────────────────────────────
    const handleLeagueChange = (val) => {
        setSelectedLeague(val);
        setSelectedWeek(null);
    };

    // ── Empty state ────────────────────────────────────────────────────────────
    if (!loading && leagues.length === 0) {
        return (
            <div
                style={{
                    minHeight: '60vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                }}
            >
                <Empty
                    description={
                        <Space direction="vertical">
                            <Text strong>No tienes ligas activas</Text>
                            <Text type="secondary">
                                Únete a una liga para empezar a participar en las predicciones.
                            </Text>
                        </Space>
                    }
                >
                    <Button type="primary" size="large" onClick={() => nav('/leagues/')}>
                        Explorar Ligas
                    </Button>
                </Empty>
            </div>
        );
    }

    const currentWeek = weeks.find(w => w.id === selectedWeek);

    return (
        <div style={{ padding: '12px 12px 40px' }}>

            {/* ── Selectors ── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>Liga</Text>
                    <Select
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Selecciona una liga"
                        value={selectedLeague}
                        onChange={handleLeagueChange}
                        loading={loading && leagues.length === 0}
                        options={leagues.map(l => ({ label: l.name, value: l.id }))}
                    />
                </Col>

                <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
                        <CalendarOutlined style={{ marginRight: 6 }} />
                        Semana
                    </Text>
                    <Select
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Selecciona una semana"
                        value={selectedWeek}
                        onChange={setSelectedWeek}
                        loading={loading && weeks.length === 0}
                        disabled={weeks.length === 0 && !loading}
                        options={weeks.map(w => ({ label: w.name, value: w.id }))}
                    />
                </Col>
            </Row>

            {/* Points badge */}
            {selectedLeague && !loading && (
                <div style={{ marginBottom: 16 }}>
                    <Tag
                        icon={<TrophyOutlined />}
                        color="gold"
                        style={{ fontSize: 12, padding: '3px 10px' }}
                    >
                        Puntos Totales = {userPoints ?? 0}
                    </Tag>
                </div>
            )}

            {/* ── Main cards ── */}
            <Row gutter={[12, 16]}>

                {/* Predicciones de la semana seleccionada */}
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <Space>
                                <FormOutlined />
                                <span>{hasPredicted ? 'Tus Predicciones' : 'Próximos Partidos'}</span>
                            </Space>
                        }
                        extra={
                            !hasPredicted && currentMatches.length > 0 && (
                                <Button type="primary" size="small" onClick={() => setSend(true)}>
                                    Enviar Todo
                                </Button>
                            )
                        }
                    >
                        <Skeleton loading={loading} active>
                            {hasPredicted ? (
                                <PredictionTable
                                    result={userCurrentPredictions}
                                    matches={currentMatches}
                                />
                            ) : currentMatches.length > 0 ? (
                                <PredictionForm
                                    send={send}
                                    data={currentMatches}
                                    leagueId={selectedLeague}
                                    setSend={() => setSend(false)}
                                />
                            ) : (
                                <Empty
                                    description={
                                        !selectedWeek
                                            ? 'Selecciona una semana para ver los partidos.'
                                            : weeks.length === 0
                                            ? 'No hay semanas disponibles para esta liga.'
                                            : 'No hay partidos pendientes de predicción para esta semana.'
                                    }
                                />
                            )}
                        </Skeleton>
                    </Card>
                </Col>

                {/* Historial de resultados (toda la liga) */}
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <Space>
                                <HistoryOutlined />
                                <span>Historial de Resultados</span>
                            </Space>
                        }
                    >
                        <Skeleton loading={loading} active>
                            <ResultTable
                                results={allResults}
                                matches={historyMatches}
                                userPredictions={allUserPredictions}
                            />
                        </Skeleton>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Prediction;
