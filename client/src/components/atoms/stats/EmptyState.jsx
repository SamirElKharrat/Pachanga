import React from 'react';
import { Button, Empty } from 'antd';

/**
 * Un hueco vacío explicado.
 *
 * Un cero no es un estado vacío: «0 % de acierto» y «esta liga no ha empezado» se ven
 * igual en pantalla y significan cosas opuestas. Cada sitio donde no hay nada que
 * enseñar dice por qué no lo hay, y cuando hay algo que hacer al respecto lleva el
 * botón para hacerlo.
 *
 * @param {Object} props
 * @param {string} props.title - Qué pasa, en una línea.
 * @param {string} [props.detail] - Por qué pasa.
 * @param {string} [props.actionLabel]
 * @param {Function} [props.onAction]
 */
function EmptyState({ title, detail, actionLabel, onAction }) {
    return (
        <Empty
            className="pstats-nothing"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
                <>
                    <span className="pstats-nothing-title">{title}</span>
                    {detail && <span className="pstats-nothing-detail">{detail}</span>}
                </>
            }
        >
            {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
        </Empty>
    );
}

export default EmptyState;
