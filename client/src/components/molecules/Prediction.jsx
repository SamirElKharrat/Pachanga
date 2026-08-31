import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Card, Row, Col, Button, Typography, Skeleton,
    Select, Space, Empty, Tag, Avatar, Flex, theme,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import PredictionForm from '../atoms/PredictionForm';
import QuestionForm from '../atoms/QuestionForm';
import PredictionTable from '../atoms/PredictionTable';
import ResultTable from '../atoms/ResultTable';
import YearFilter from '../atoms/YearFilter';
import SegmentedControl from '../atoms/SegmentedControl';
import { HistoryOutlined, FormOutlined, CalendarOutlined, TrophyOutlined, FilterOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { usePredictionData } from '../../hooks/usePredictionData';
import { API } from '../../services/api';
import { showAlert } from '../atoms/AlertInfo';
import ModalInfo from '../atoms/ModalInfo';

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
    const { token } = theme.useToken();

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [selectedWeek, setSelectedWeek]     = useState(null);
    // Qué pestaña se está mirando dentro de la tarjeta izquierda.
    const [tab, setTab] = useState('matches');

    // ── Lo que hay relleno en cada mitad ──────────────────────────────────────
    //
    // La jornada se envía ENTERA: ni los partidos sin las preguntas ni al revés. Eso
    // obliga a que el envío viva aquí, que es lo único que ve las dos mitades a la
    // vez; los formularios solo recogen y avisan.
    //
    // useCallback en los dos manejadores porque son dependencia de un efecto de los
    // hijos: sin él, cada render sería una función nueva y el efecto no pararía.
    const [matchDraft, setMatchDraft] = useState({ done: 0, total: 0, payload: [] });
    const [questionDraft, setQuestionDraft] = useState({ done: 0, total: 0, payload: [] });
    const handleMatchChange = useCallback((d) => setMatchDraft(d), []);
    const handleQuestionChange = useCallback((d) => setQuestionDraft(d), []);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Toggle state to collapse selectors
    const [filtersCollapsed, setFiltersCollapsed] = useState(() => {
        return localStorage.getItem('pachanga_filters_collapsed') === 'true';
    });

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
        questions,
        reload,
        loading,
    } = usePredictionData(selectedLeague, selectedWeek);

    // ── Estado de las preguntas de la jornada ─────────────────────────────────
    const unanswered = questions.filter(q => !q.myAnswer && !q.correct_option).length;
    const hasQuestions = questions.length > 0;

    // Una pestaña que no tiene nada detrás no se enseña, y si estabas en ella al
    // cambiar de semana hay que devolverte a los partidos.
    useEffect(() => {
        if (!hasQuestions && tab === 'questions') setTab('matches');
    }, [hasQuestions, tab]);

    // Al cambiar de liga o de semana, lo relleno de la anterior no vale. Importa de
    // verdad: si la nueva jornada ya tiene los partidos enviados, su formulario no se
    // pinta, nadie vuelve a avisar, y sin esto se enviaría el borrador de la semana
    // pasada. Los formularios llevan además `key` para que se vacíen ellos también.
    useEffect(() => {
        setMatchDraft({ done: 0, total: 0, payload: [] });
        setQuestionDraft({ done: 0, total: 0, payload: [] });
    }, [selectedLeague, selectedWeek]);

    // ── Envío de la jornada ───────────────────────────────────────────────────
    const matchesPending = !hasPredicted && currentMatches.length > 0;
    const questionsPending = unanswered > 0;
    const anythingPending = matchesPending || questionsPending;

    /**
     * Comprueba que está TODO relleno y abre la confirmación.
     *
     * Si falta algo, además de avisar te lleva a la pestaña donde está lo que falta:
     * decir «te faltan 2 preguntas» sin enseñarlas sería mandar a buscar a ciegas.
     */
    const handleSubmitAll = () => {
        if (matchesPending && matchDraft.done < matchDraft.total) {
            setTab('matches');
            showAlert('error', 'Completa todos los partidos antes de enviar.');
            return;
        }
        if (questionsPending && questionDraft.done < questionDraft.total) {
            setTab('questions');
            showAlert('error', 'Responde a todas las preguntas antes de enviar.');
            return;
        }
        setConfirmOpen(true);
    };

    /**
     * Manda las dos mitades.
     *
     * Las respuestas primero, y a propósito: son una sola llamada atómica, mientras
     * que las predicciones son una por partido. Si algo se cae a medias, es mucho
     * mejor quedarse con las respuestas dentro y los partidos fuera —se reintenta y
     * ya está— que al revés, que es justamente el estado que este cambio quiere
     * evitar: partidos enviados y preguntas colgando.
     */
    const submitAll = async () => {
        setSubmitting(true);
        try {
            if (questionDraft.payload.length > 0) {
                await API.post('/questions/answer', { answers: questionDraft.payload });
            }

            if (matchDraft.payload.length > 0) {
                const user = await API.getUserByToken();
                await Promise.all(matchDraft.payload.map(p =>
                    API.post('/predictions/set', { ...p, user_id: user.id })
                ));
            }

            showAlert('success', '¡Jornada enviada con éxito!');
            setConfirmOpen(false);
            nav('/', { state: { leagueId: selectedLeague } });
        } catch (error) {
            const motivo = error?.response?.data?.error;
            showAlert('error', motivo || 'No se pudo enviar la jornada');
            console.error('Error submitting week:', error);
            setConfirmOpen(false);
            // Recarga para que se vea qué entró y qué no, en vez de dejar la
            // pantalla enseñando un estado que ya no es cierto.
            reload();
        } finally {
            setSubmitting(false);
        }
    };

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

            {/* ── Collapsible selectors card ── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <Card
                        className="selectors-card"
                        title={
                            <Space size={8}>
                                <FilterOutlined style={{ color: token.colorPrimary }} />
                                <span style={{ fontSize: 13, fontWeight: 700 }}>Filtros de Competición</span>
                            </Space>
                        }
                        extra={
                            <Button 
                                type="text" 
                                size="small" 
                                onClick={() => {
                                    setFiltersCollapsed(prev => {
                                        const next = !prev;
                                        localStorage.setItem('pachanga_filters_collapsed', String(next));
                                        return next;
                                    });
                                }}
                                icon={filtersCollapsed ? <DownOutlined /> : <UpOutlined />}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                {filtersCollapsed ? 'Mostrar' : 'Ocultar'}
                            </Button>
                        }
                        style={{
                            background: 'rgba(var(--tint), 0.02)',
                            border: '1px solid rgba(var(--tint), 0.06)',
                            borderRadius: 16,
                            marginBottom: 0
                        }}
                    >
                        {filtersCollapsed ? (
                            <Space split={<span style={{ color: 'rgba(var(--tint),0.15)' }}>|</span>} style={{ width: '100%' }} wrap>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Año: <span style={{ color: token.colorText, fontWeight: 600 }}>{selectedYear || 'Todos'}</span>
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Liga: <span style={{ color: token.colorText, fontWeight: 600 }}>{leagues.find(l => l.id === selectedLeague)?.name || 'Ninguna'}</span>
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Semana: <span style={{ color: token.colorText, fontWeight: 600 }}>{weeks.find(w => w.id === selectedWeek)?.name || 'Ninguna'}</span>
                                </Text>
                            </Space>
                        ) : (
                            <Row gutter={[16, 16]}>
                                {/* AÑO (Restored custom YearFilter) */}
                                <Col xs={24}>
                                    <YearFilter
                                        leagues={leagues}
                                        selectedYear={selectedYear}
                                        onYearChange={handleYearChange}
                                    />
                                </Col>

                                {/* LIGA SELECCIONADA */}
                                <Col xs={24}>
                                    <Flex vertical gap={8}>
                                        <Text strong style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', color: 'rgba(var(--tint),0.5)', letterSpacing: '0.08em' }}>Liga Seleccionada</Text>
                                        {loading && leagues.length === 0 ? (
                                            <Skeleton.Button active block style={{ height: 32 }} />
                                        ) : (
                                            <SegmentedControl 
                                                options={filteredLeagues.map(l => ({ value: l.id, label: l.name }))}
                                                value={selectedLeague}
                                                onChange={handleLeagueChange}
                                                disabled={loading && leagues.length === 0}
                                            />
                                        )}
                                    </Flex>
                                </Col>

                                {/* SEMANA */}
                                <Col xs={24}>
                                    <Flex vertical gap={8}>
                                        <Text strong style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', color: 'rgba(var(--tint),0.5)', letterSpacing: '0.08em' }}>
                                            <CalendarOutlined style={{ marginRight: 6 }} />
                                            Semana
                                        </Text>
                                        {loading && weeks.length === 0 ? (
                                            <Skeleton.Button active block style={{ height: 32 }} />
                                        ) : (
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
                                </Col>
                            </Row>
                        )}
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
                        // Con preguntas, el título deja su sitio al segmentado. Sin
                        // ellas la tarjeta es exactamente la de siempre.
                        title={
                            hasQuestions ? (
                                <SegmentedControl
                                    options={[
                                        { value: 'matches', label: `Partidos${currentMatches.length ? ` (${currentMatches.length})` : ''}` },
                                        { value: 'questions', label: 'Preguntas', badge: unanswered > 0 },
                                    ]}
                                    value={tab}
                                    onChange={setTab}
                                />
                            ) : (
                                <Space>
                                    <FormOutlined />
                                    <span>{hasPredicted ? 'Tus Predicciones' : 'Próximos Partidos'}</span>
                                </Space>
                            )
                        }
                        // Un solo botón para toda la jornada, esté donde esté puesta la
                        // pestaña: no se manda media jornada.
                        extra={
                            anythingPending && (
                                <Button type="primary" size="small" loading={submitting} onClick={handleSubmitAll}>
                                    Enviar Todo
                                </Button>
                            )
                        }
                    >
                        <Skeleton loading={loading} active>
                            {/* El contador. Lo que está detrás de una pestaña no se
                                ve, así que hay que decir en voz alta lo que falta. */}
                            {hasQuestions && (
                                <Flex justify="space-between" gap={12} style={{ marginBottom: 12 }}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {hasPredicted
                                            ? `${currentMatches.length} partidos enviados`
                                            : `${matchDraft.done} de ${matchDraft.total} partidos`}
                                        {' · '}
                                        {questionsPending
                                            ? `${questionDraft.done} de ${questionDraft.total} preguntas`
                                            : `${questions.length} preguntas enviadas`}
                                    </Text>
                                    {anythingPending && (
                                        <Text style={{ fontSize: 11, color: 'var(--pred-acierto)' }}>
                                            Se envía todo junto
                                        </Text>
                                    )}
                                </Flex>
                            )}

                            {tab === 'questions' ? (
                                <QuestionForm
                                    key={`q-${selectedLeague}-${selectedWeek}`}
                                    questions={questions}
                                    onChange={handleQuestionChange}
                                />
                            ) : hasPredicted ? (
                                <PredictionTable
                                    result={userCurrentPredictions}
                                    matches={currentMatches}
                                />
                            ) : currentMatches.length > 0 ? (
                                <PredictionForm
                                    key={`m-${selectedLeague}-${selectedWeek}`}
                                    data={currentMatches}
                                    onChange={handleMatchChange}
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

            {/* La confirmación es una sola, porque el envío es uno solo. */}
            <ModalInfo
                title="Confirmar envío"
                description={
                    questionsPending && matchesPending
                        ? 'Se enviarán tus predicciones y tus respuestas a la vez. No podrás cambiarlas.'
                        : questionsPending
                            ? 'Se enviarán tus respuestas. No podrás cambiarlas.'
                            : 'Se enviarán tus predicciones. No podrás cambiarlas.'
                }
                open={confirmOpen}
                onSuccess={submitAll}
                onClose={() => setConfirmOpen(false)}
                okText="Confirmar"
                cancelText="Cancelar"
            />
        </Flex>
    );
};

export default Prediction;
