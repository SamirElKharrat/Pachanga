import { App } from 'antd';
import { useEffect } from 'react';

/**
 * Global reference to the Ant Design message API.
 * Initialized by the AlertProvider component.
 */
let messageApi = null;

/**
 * Utility function to show global alerts.
 * 
 * @param {'success'|'error'|'info'|'warning'} type - The type of alert to show.
 * @param {string} content - The message content.
 * @example
 * showAlert('success', 'Operation completed!');
 */
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
        console.warn('messageApi no está inicializado. Asegúrate de que AlertProvider envuelva tu aplicación.');
    }
};

/**
 * Provider component that captures the Ant Design message API for global use.
 * This should wrap the main App component.
 * 
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components.
 * @returns {React.ReactElement} The provider component.
 */
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