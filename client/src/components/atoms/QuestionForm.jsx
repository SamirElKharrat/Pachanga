import React, { useState, useEffect } from 'react';
import { Radio, Input, Typography, Tag, Empty, Flex, theme } from 'antd';
import { QUESTION_POINTS, TEXT_ANSWER_MAX } from '../../constants/pachanga';

const { Text } = Typography;

/** Si se contesta escribiendo. Las de antes de existir el tipo son todas de opciones. */
const isText = (question) => question.answer_type === 'text';

/** Lo escrito, listo para enviar: sin espacios en los bordes. */
const clean = (value) => (typeof value === 'string' ? value.trim() : value);

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
    // `settled` lo manda el servidor (mira `closed_at`). Una de texto puede quedar
    // corregida sin ninguna respuesta buena, así que `correct_option` no sirve.
    if (question.settled) return 'settled';
    return question.myAnswer ? 'sent' : 'open';
};

/** La línea gris bajo el enunciado, ya corregida. */
const solutionOf = (question) => {
    if (!isText(question)) return `Respuesta correcta: ${question.correct_option}`;
    const accepted = question.accepted_answers || [];
    return accepted.length
        ? `${accepted.length > 1 ? 'Valían' : 'Valía'}: ${accepted.join(', ')}`
        : 'Nadie la acertó';
};

/**
 * Lo que escribió alguien en una pregunta de texto, ya enviado. Mismos colores que
 * LockedOption: azul mientras no se corrige, verde o rojo después.
 */
function LockedText({ answer, settled, correct }) {
    const { token } = theme.useToken();
    const tone = !settled
        ? { border: token.colorPrimary, text: token.colorPrimary, bg: `${token.colorPrimary}1a` }
        : correct
            ? { border: 'var(--success)', text: 'var(--success)', bg: 'rgba(var(--success-rgb), 0.12)' }
            : { border: 'var(--danger)', text: 'var(--danger)', bg: 'rgba(var(--danger-rgb), 0.10)' };

    return (
        <div
            style={{
                minHeight: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                border: `1px solid ${tone.border}`,
                background: tone.bg,
                color: tone.text,
                overflowWrap: 'anywhere',
            }}
        >
            {answer}
            {settled && correct && <span aria-hidden="true">✓</span>}
        </div>
    );
}

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
        // Un texto solo de espacios no cuenta como respondido.
        const answered = pending.filter(q => clean(picked[q.id]));
        onChange({
            done: answered.length,
            total: pending.length,
            payload: answered.map(q => ({ question_id: q.id, answer: clean(picked[q.id]) })),
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
                // El acierto lo decide el servidor (mismo cálculo que reparte los puntos).
                const hit = settled && question.myCorrect === true;

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
                                    {state === 'open' && (isText(question)
                                        ? 'Respuesta libre · se corrige al acabar la jornada'
                                        : 'Se corrige al acabar la jornada')}
                                    {state === 'sent' && 'Enviada · pendiente de corregir'}
                                    {settled && solutionOf(question)}
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

                        {isText(question) ? (
                            state === 'open' ? (
                                <Input
                                    id={`question-${question.id}`}
                                    aria-label={question.text}
                                    value={picked[question.id] || ''}
                                    onChange={e => setPicked(prev => ({ ...prev, [question.id]: e.target.value }))}
                                    maxLength={TEXT_ANSWER_MAX}
                                    showCount
                                    placeholder="Escribe tu respuesta"
                                    autoComplete="off"
                                />
                            ) : question.myAnswer ? (
                                <LockedText answer={question.myAnswer} settled={settled} correct={hit} />
                            ) : (
                                <Text type="secondary" italic style={{ fontSize: 13 }}>No la respondiste</Text>
                            )
                        ) : state === 'open' ? (
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
