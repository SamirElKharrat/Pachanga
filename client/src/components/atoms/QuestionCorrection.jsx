import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Flex, Select, Skeleton, Tag, Tooltip, Typography } from 'antd';
import { CheckOutlined, UndoOutlined } from '@ant-design/icons';
import { API } from '../../services/api';
import { showAlert } from './AlertInfo';

const { Text } = Typography;

/**
 * Corregir las preguntas de texto libre.
 *
 * Las respuestas llegan agrupadas por cómo se escriben normalizadas: «Faker», «FAKER»
 * y «faker!!» son un solo grupo. Se marcan los grupos que valen y se guarda; eso
 * cierra la pregunta y reparte los puntos, igual que marcar la opción correcta en las
 * de opciones. Se puede volver a corregir cuantas veces haga falta: el servidor mueve
 * los puntos por diferencia.
 *
 * Si un grupo está a una letra de otro mayor o ya aceptado, se avisa («¿parecida
 * a…?»): casi siempre es una falta de ortografía, pero lo decide quien corrige.
 */
export default function QuestionCorrection() {
    const [questions, setQuestions] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    /** @type {[{status: 'idle'|'loading'|'ready'|'error', question?: object, groups?: object[]}, Function]} */
    const [detail, setDetail] = useState({ status: 'idle' });
    const [checked, setChecked] = useState(() => new Set());
    const [saving, setSaving] = useState(false);

    const loadQuestions = useCallback(async () => {
        try {
            const all = await API.get('/questions/get');
            const text = all.filter(q => q.answer_type === 'text');
            setQuestions(text);
            // Por defecto, la primera sin corregir (el servidor las devuelve primero).
            setSelectedId(prev => prev ?? (text[0] ? text[0].id : null));
        } catch (error) {
            console.error('No se pudieron cargar las preguntas:', error);
            showAlert('error', 'No se pudieron cargar las preguntas');
        }
    }, []);

    useEffect(() => { loadQuestions(); }, [loadQuestions]);

    const loadGroups = useCallback(async (id) => {
        setDetail({ status: 'loading' });
        try {
            const r = await API.get(`/questions/groups/${id}`);
            setDetail({ status: 'ready', question: r.question, groups: r.groups });
            setChecked(new Set(r.groups.filter(g => g.accepted).map(g => g.key)));
        } catch (error) {
            console.error('No se pudieron cargar las respuestas:', error);
            setDetail({ status: 'error' });
        }
    }, []);

    useEffect(() => {
        if (selectedId) loadGroups(selectedId);
        else setDetail({ status: 'idle' });
    }, [selectedId, loadGroups]);

    const toggle = (key) => setChecked(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });

    const save = async (body, okText) => {
        setSaving(true);
        try {
            await API.put(`/questions/settle/${selectedId}`, body);
            showAlert('success', okText);
            await Promise.all([loadQuestions(), loadGroups(selectedId)]);
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo guardar la corrección');
        } finally {
            setSaving(false);
        }
    };

    const options = useMemo(() => questions.map(q => ({
        value: q.id,
        label: `${q.closed_at ? '✓' : '•'} ${q.League ? q.League.name : `Liga ${q.league_id}`} · J${q.week} · ${q.text}`,
    })), [questions]);

    if (questions.length === 0) {
        return (
            <Empty
                style={{ padding: 32 }}
                description="No hay preguntas de texto libre. Créalas en la pestaña Preguntas eligiendo «Texto libre»."
            />
        );
    }

    const { question, groups = [] } = detail;
    const settled = !!(question && question.closed_at);
    const acceptedLabels = groups.filter(g => checked.has(g.key)).map(g => g.label);
    const totalAnswers = groups.reduce((n, g) => n + g.count, 0);
    const winners = groups.filter(g => checked.has(g.key)).reduce((n, g) => n + g.count, 0);

    return (
        <div style={{ padding: '4px 8px 16px', maxWidth: 820 }}>
            <Flex vertical gap={16}>
                <Select
                    id="question-correction-select"
                    aria-label="Pregunta que corregir"
                    value={selectedId}
                    onChange={setSelectedId}
                    options={options}
                    showSearch
                    optionFilterProp="label"
                    style={{ width: '100%' }}
                />

                {detail.status === 'loading' && <Skeleton active paragraph={{ rows: 5 }} />}

                {detail.status === 'error' && (
                    <Alert
                        type="error"
                        showIcon
                        message="No se pudieron cargar las respuestas"
                        action={<Button size="small" onClick={() => loadGroups(selectedId)}>Reintentar</Button>}
                    />
                )}

                {detail.status === 'ready' && (
                    <>
                        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                            <Text strong style={{ fontSize: 15 }}>{question.text}</Text>
                            <Tag color={settled ? 'success' : 'processing'} style={{ margin: 0 }}>
                                {settled ? 'Corregida' : 'Sin corregir'}
                            </Tag>
                        </Flex>

                        {groups.length === 0 ? (
                            <Empty description="Nadie ha respondido todavía." />
                        ) : (
                            <Flex vertical gap={8}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {totalAnswers} respuestas en {groups.length} grupos. Marca las que valen.
                                </Text>
                                {groups.map(g => (
                                    <Flex
                                        key={g.key}
                                        align="center"
                                        justify="space-between"
                                        wrap="wrap"
                                        gap={8}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            border: `1px solid ${checked.has(g.key) ? 'var(--success)' : 'rgba(var(--tint), 0.12)'}`,
                                            background: checked.has(g.key) ? 'rgba(var(--success-rgb), 0.08)' : 'transparent',
                                        }}
                                    >
                                        <Checkbox
                                            id={`group-${g.key}`}
                                            checked={checked.has(g.key)}
                                            onChange={() => toggle(g.key)}
                                            disabled={saving}
                                        >
                                            <Text strong>{g.label}</Text>
                                            {g.variants.length > 1 && (
                                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                                    también: {g.variants.slice(1).join(' · ')}
                                                </Text>
                                            )}
                                        </Checkbox>
                                        <Flex align="center" gap={8}>
                                            {g.similarTo && !checked.has(g.key) && (
                                                <Tag color="gold" style={{ margin: 0 }}>¿parecida a «{g.similarTo}»?</Tag>
                                            )}
                                            <Tooltip title={g.users.join(', ')}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {g.count} {g.count === 1 ? 'persona' : 'personas'}
                                                </Text>
                                            </Tooltip>
                                        </Flex>
                                    </Flex>
                                ))}
                            </Flex>
                        )}

                        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {acceptedLabels.length
                                    ? `Aciertan ${winners} de ${totalAnswers}.`
                                    : 'Sin ninguna marcada, la pregunta se cierra como «nadie la acertó».'}
                            </Text>
                            <Flex gap={8}>
                                {settled && (
                                    <Button
                                        icon={<UndoOutlined />}
                                        disabled={saving}
                                        onClick={() => save({ reopen: true }, 'Pregunta reabierta: puntos devueltos')}
                                    >
                                        Reabrir
                                    </Button>
                                )}
                                <Button
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={saving}
                                    onClick={() => save(
                                        { accepted_answers: acceptedLabels },
                                        settled ? 'Corrección actualizada' : 'Pregunta corregida: puntos repartidos'
                                    )}
                                >
                                    {settled ? 'Guardar corrección' : 'Corregir y repartir puntos'}
                                </Button>
                            </Flex>
                        </Flex>
                    </>
                )}
            </Flex>
        </div>
    );
}
