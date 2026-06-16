import React, { useState, useEffect } from 'react';
import {
    Card, Row, Col, Button, Typography, Skeleton,
    Select, Space, Empty, Tag, Avatar, Flex,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import PredictionForm from '../atoms/PredictionForm';
import PredictionTable from '../atoms/PredictionTable';
import ResultTable from '../atoms/ResultTable';
import YearFilter from '../atoms/YearFilter';
import SegmentedControl from '../atoms/SegmentedControl';
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

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

    const filteredLeagues = selectedYear
        ? leagues.filter(l => new Date(l.start_date).getFullYear() === selectedYear)
        : leagues;

    // ── Auto-select first league once leagues load ─────────────────────────────
    useEffect(() => {
        if (filteredLeagues.length > 0 && (selectedLeague === null || !filteredLeagues.find(l => l.id === selectedLeague))) {
            setSelectedLeague(filteredLeagues[0].id);
        }
    }, [filteredLeagues]);

    const handleYearChange = (year) => {
        setSelectedYear(year);
    };

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
            if (currentWeek) {
                setSelectedWeek(currentWeek.id);
            } else {
                // Si la liga no ha empezado aún (hoy es antes de la primera semana) -> Semana 1
                if (todayStr < computed[0].start) {
                    setSelectedWeek(computed[0].id);
                } else {
                    // Si la liga ya terminó (hoy es después del final) -> Última semana
                    setSelectedWeek(computed[computed.length - 1].id);
                }
            }
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
            <Flex
                vertical
                align="center"
                justify="center"
                style={{
                    minHeight: '60vh',
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
            </Flex>
        );
    }

    // const currentWeek = weeks.find(w => w.id === selectedWeek);

    return (
        <Flex vertical style={{ padding: '12px 12px 40px' }}>

            {/* ── Scrollbar hiding style ── */}
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .selectors-card .ant-card-body {
                    padding: 16px 20px;
                }
                @media (max-width: 576px) {
                    .selectors-card .ant-card-body {
                        padding: 12px 14px !important;
                    }
                }
            `}</style>

            {/* ── Selectors ── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <YearFilter
                        leagues={leagues}
                        selectedYear={selectedYear}
                        onYearChange={handleYearChange}
                    />
                </Col>
                <Col xs={24}>
                    <Card
                        className="selectors-card"
                        style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: 16,
                            marginBottom: 0
                        }}
                    >
                        {/* LIGA SELECCIONADA */}
                        <Flex vertical style={{ marginBottom: 20 }}>
                            <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>Liga Seleccionada</Text>
                            {loading && leagues.length === 0 ? <Skeleton.Button active /> : (
                                <SegmentedControl 
                                    options={filteredLeagues.map(l => ({ value: l.id, label: l.name }))}
                                    value={selectedLeague}
                                    onChange={handleLeagueChange}
                                    disabled={loading && leagues.length === 0}
                                />
                            )}
                        </Flex>

                        {/* SEMANA */}
                        <Flex vertical>
                            <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
                                <CalendarOutlined style={{ marginRight: 6 }} />
                                Semana
                            </Text>
                            {loading && weeks.length === 0 ? <Skeleton.Button active /> : (
                                <SegmentedControl 
                                    options={weeks.map(w => {
                                        const todayStr = new Date().toISOString().split('T')[0];
                                        const isCurrent = todayStr >= w.start && todayStr <= w.end;
                                        return { value: w.id, label: `${w.name} ${isCurrent ? '(Actual)' : ''}` };
                                    })}
                                    value={selectedWeek}
                                    onChange={setSelectedWeek}
                                    disabled={loading && weeks.length === 0}
                                />
                            )}
                        </Flex>
                    </Card>
                </Col>
            </Row>

            {/* Points badge */}
            {selectedLeague && !loading && (
                <Flex style={{ marginBottom: 16 }}>
                    <Tag
                        icon={<TrophyOutlined />}
                        color="gold"
                        style={{ fontSize: 12, padding: '3px 10px' }}
                    >
                        Puntos Totales = {userPoints ?? 0}
                    </Tag>
                </Flex>
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
        </Flex>
    );
};

export default Prediction;
