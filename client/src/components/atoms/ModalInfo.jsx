import React from 'react';
import { Modal } from 'antd';

/**
 * A reusable modal component for displaying information or prompts.
 * 
 * @param {Object} props - Component props.
 * @param {string} props.title - The modal title.
 * @param {React.ReactNode} props.description - The modal content.
 * @param {boolean} props.open - Whether the modal is visible.
 * @param {Function} props.onSuccess - Callback on OK button click.
 * @param {Function} props.onClose - Callback on Cancel/Close.
 * @param {string} [props.okText] - Label for the OK button.
 * @param {string} [props.cancelText] - Label for the Cancel button.
 * @param {boolean} [props.confirmLoading] - Mientras dura la acción del OK: lo deja
 *   girando y no se puede volver a pulsar. Lo necesita todo OK que haga una petición.
 * @returns {React.ReactElement} The rendered Modal component.
 */
const ModalInfo = ({ title, description, open, onSuccess, onClose, okText, cancelText, confirmLoading = false }) => {
    return (
        <Modal
            title={title}
            open={open}
            onOk={() => onSuccess(true)}
            onCancel={onClose}
            okText={okText}
            cancelText={cancelText}
            confirmLoading={confirmLoading}
            centered
            destroyOnClose
            width={800}
        >
            <div className="py-3">
                {description}
            </div>
        </Modal>
    );
};

export default ModalInfo;
