import React from 'react';
import { Modal } from 'antd';

const ModalInfo = ({ title, description, open, onSuccess, onClose, okText, cancelText }) => {


    return (
        <Modal
            title={title}
            open={open}
            onOk={() => onSuccess(true)}
            onCancel={onClose}
            okText={okText}
            cancelText={cancelText}
            centered
        >
            {description}
        </Modal>
    );
};

export default ModalInfo;
