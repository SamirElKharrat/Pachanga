import React, { useState, useEffect } from 'react';
import { Radio, Typography, Tag, Empty, Flex, theme } from 'antd';

const { Text } = Typography;

/** Lo que vale acertar una pregunta. Igual que QUESTION_POINTS en el servidor. */
const QUESTION_POINTS = 4;

/**
 * El estado en que está una pregunta para quien la mira.
 *
 * - `open`      todavía se puede responder
 * - `sent`      respondida, esperando a que acabe la jornada
 * - `settled`   corregida: ya se sabe si se acertó
 *
 * @param {Object} question
 * @returns {'open'|'sent'|'settled'}
 */
const stateOf = (question) => {
    if (question.correct_option) return 'settled';
    return question.myAnswer ? 'sent' : 'open';
};

/**
 * Una opción ya bloqueada. No se pinta con Radio a propósito: un Radio deshabilitado
 * en verde o en rojo obliga a pelearse con las clases internas de Antd, y esto no es
 * un control, es un resultado.
 */
function LockedOption({ label, picked, correct, settled }) {
    const { token } = theme.useToken();

    // El acierto y el fallo solo existen cuando la pregunta está corregida. Antes,
    // lo elegido se marca en el color de siempre y lo demás se apaga.
    const tone = !settled
        ? (picked ? { border: token.colorPrimary, text: token.colorPrimary, bg: `${token.colorPrimary}1a` } : null)
        : correct
            ? { border: 'var(--success)', text: 'var(--success)', bg: 'rgba(var(--success-rgb), 0.12)' }
            : picked
                ? { border: 'var(--danger)', text: 'var(--danger)', bg: 'rgba(var(--danger-rgb), 0.10)' }
                : null;

    return (
        <div
            style={{
                flex: '1 1 78px',
                minWidth: 78,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '0 10px',
                borderRadius: 6,
                fontSize: 13,
                textAlign: 'center',
                border: `1px ${tone ? 'solid' : 'dashed'} ${tone ? tone.border : token.colorBorder}`,
                background: tone ? tone.bg : 'transparent',
                color: tone ? tone.text : token.colorTextQuaternary,
                fontWeight: tone ? 600 : 400,
            }}
        >
            {label}
            {settled && correct && <span aria-hidden="true">✓</span>}
        </div>
    );
}

/**
 * Las preguntas de la jornada.
 *
 * Un solo componente para los tres estados, porque son la misma información en
 * distinto momento: separarlos en dos componentes acaba con dos maquetaciones que
 * se van pareciendo cada vez menos.
 *
 * Las respuestas no se pueden cambiar, y no se mandan solas: la jornada se envía
 * entera, partidos y preguntas a la vez. Por eso aquí no hay ninguna llamada al
 * servidor — solo se recoge lo elegido y se informa hacia arriba, que es quien ve
 * las dos mitades.
 *
 * @param {Object} props
 * @param {Array} props.questions - Las de la jornada, con `myAnswer` si ya se envió.
 * @param {Function} props.onChange - Recibe { done, total, payload } al cambiar algo.
 *   `payload` es lo que hay que mandar a /questions/answer.
 */
export default function QuestionForm({ questions, onChange }) {
    const { token } = theme.useToken();
    const [picked, setPicked] = useState({});

    const pending = questions.filter(q => stateOf(q) === 'open');

    /** Informa hacia arriba de lo respondido y de lo que habría que enviar. */
    useEffect(() => {
        if (!onChange) return;
        const answered = pending.filter(q => picked[q.id]);
        onChange({
            done: answered.length,
            total: pending.length,
            payload: answered.map(q => ({ question_id: q.id, answer: picked[q.id] })),
        });
    }, [picked, questions, onChange]);

    if (questions.length === 0) {
        return <Empty description="No hay preguntas para esta jornada." />;
    }

    return (
        <div>
            {questions.map((question, i) => {
                const state = stateOf(question);
                const settled = state === 'settled';
                const hit = settled && question.myAnswer === question.correct_option;

                return (
                    <div
                        key={question.id}
                        style={{
                            padding: '14px 0',
                            borderTop: i === 0 ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                        }}
                    >
                        <Flex justify="space-between" align="flex-start" gap={12} style={{ marginBottom: 10 }}>
                            <div>
                                <Text strong style={{ fontSize: 14, display: 'block', lineHeight: 1.4 }}>
                                    {question.text}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {state === 'open' && 'Se corrige al acabar la jornada'}
                                    {state === 'sent' && 'Enviada · pendiente de corregir'}
                                    {settled && `Respuesta correcta: ${question.correct_option}`}
                                </Text>
                            </div>

                            {settled ? (
                                <Tag color={hit ? 'success' : 'error'} style={{ margin: 0 }}>
                                    {hit ? `+${QUESTION_POINTS} pts` : '0 pts'}
                                </Tag>
                            ) : (
                                <Tag color={state === 'sent' ? 'default' : 'blue'} style={{ margin: 0 }}>
                                    +{QUESTION_POINTS} pts
                                </Tag>
                            )}
                        </Flex>

                        {state === 'open' ? (
                            <Radio.Group
                                value={picked[question.id]}
                                onChange={e => setPicked(prev => ({ ...prev, [question.id]: e.target.value }))}
                                style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}
                            >
                                {question.options.map(option => (
                                    <Radio.Button
                                        key={option}
                                        value={option}
                                        style={{
                                            flex: '1 1 78px',
                                            minWidth: 78,
                                            height: 36,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 13,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {option}
                                    </Radio.Button>
                                ))}
                            </Radio.Group>
                        ) : (
                            <Flex wrap="wrap" gap={8}>
                                {question.options.map(option => (
                                    <LockedOption
                                        key={option}
                                        label={option}
                                        picked={question.myAnswer === option}
                                        correct={question.correct_option === option}
                                        settled={settled}
                                    />
                                ))}
                            </Flex>
                        )}
                    </div>
                );
            })}

        </div>
    );
}
