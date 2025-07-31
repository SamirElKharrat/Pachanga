// components/atoms/AlertInfo.jsx
import { App } from 'antd';
import { useEffect } from 'react';

let messageApi = null;

export const showAlert = (type, content) => {
    if (messageApi) {
        messageApi[type]({
            content,
            style: {
                marginTop: '50px',
                zIndex: 10000
            }
        });
    } else {
        console.warn('messageApi no está inicializado');
    }
};

const AlertProvider = ({ children }) => {
    const { message } = App.useApp();

    useEffect(() => {
        messageApi = message;
        return () => {
            messageApi = null;
        };
    }, [message]);

    return children;
};

export default AlertProvider;