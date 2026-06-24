import { Card, Form, Input, Button, Typography, Image, Space, theme, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { API } from '../../services/api';
import { showAlert } from './AlertInfo';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

/**
 * Authentication form component for Login and Registration.
 * Handles user input, validation, and API communication.
 * 
 * @param {Object} props - Component props.
 * @param {'login'|'register'} props.method - The authentication mode.
 * @returns {React.ReactElement} The AuthForm component.
 */
const AuthForm = ({ method }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();
    const { token } = theme.useToken();

    const isRegister = method === 'register';

    /**
     * Handles form submission.
     * @param {Object} values - The validated form values.
     */
    const onFinish = async (values) => {
        const endpoint = isRegister ? 'users/register' : 'users/login';

        // Capitalize username
        if (values.username) {
            values.username = values.username.charAt(0).toUpperCase() + values.username.slice(1);
        }

        try {
            setLoading(true);
            const data = await API.post(`/${endpoint}`, values);

            if (data.error) {
                showAlert('error', data.error);
                return;
            }

            if (isRegister) {
                showAlert('success', '¡Registro completado! Ahora puedes iniciar sesión.');
                nav('/login');
            } else {
                showAlert('success', 'Sesión iniciada con éxito.');
                nav('/');
            }
        } catch (error) {
            console.error("Auth error:", error);
            showAlert('error', isRegister ? 'Error al crear la cuenta' : 'Error al iniciar sesión. Revisa tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-container d-flex flex-column align-items-center justify-content-center"
            style={{
                minHeight: '100vh',
                background: token.colorBgBase,
                padding: '20px'
            }}>

            <div className="mb-5 text-center">
                <Image
                    preview={false}
                    src="/pachanga_logo_blanco.webp"
                    width={180}
                    style={{ 
                        cursor: 'pointer',
                        filter: token.colorBgBase === '#f8fafc' ? 'invert(1)' : 'none'
                    }}
                    onClick={() => nav('/')}
                />
            </div>

            <Card
                className="auth-card shadow border-0"
                style={{
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: 20,
                    background: token.colorBgContainer,
                    border: `1px solid ${token.colorBorder}`,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
                }}
            >
                <div className="text-center mb-4">
                    <Title level={2} style={{ margin: 0 }}>
                        {isRegister ? 'Crear Cuenta' : 'Bienvenido'}
                    </Title>
                    <Text type="secondary">
                        {isRegister ? 'Únete a la mejor comunidad de Esports' : 'Ingresa para gestionar tus predicciones'}
                    </Text>
                </div>

                <Form
                    form={form}
                    name="auth"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="username"
                        label="Nombre de Usuario"
                        rules={[{ required: true, message: 'Ingresa tu nombre de usuario' }]}
                    >
                        <Input
                            prefix={<UserOutlined className="text-secondary" />}
                            placeholder="Ej: Faker123"
                        />
                    </Form.Item>

                    {isRegister && (
                        <Form.Item
                            name="email"
                            label="Correo Electrónico"
                            rules={[
                                { required: true, message: 'Ingresa tu correo' },
                                { type: 'email', message: 'Ingresa un correo válido' }
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined className="text-secondary" />}
                                placeholder="tu@email.com"
                            />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="password"
                        label="Contraseña"
                        rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined className="text-secondary" />}
                            placeholder="••••••••"
                        />
                    </Form.Item>

                    {!isRegister && (
                        <Form.Item name="keepSession" valuePropName="checked" style={{ marginBottom: 16 }}>
                            <Checkbox style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Mantener sesión iniciada</Checkbox>
                        </Form.Item>
                    )}

                    <Form.Item className="mt-4">
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            icon={<ArrowRightOutlined />}
                            style={{ height: 50, borderRadius: 12, fontWeight: 600, fontSize: 16 }}
                        >
                            {isRegister ? 'Registrarse' : 'Entrar'}
                        </Button>
                    </Form.Item>
                </Form>

                {!isRegister && (
                    <div className="text-center pt-2">
                        <Text type="secondary" style={{ fontStyle: 'italic', opacity: 0.5 }}>
                            Los registros están cerrados actualmente. contacta con un administrador.
                        </Text>
                    </div>
                )}
                {isRegister && (
                    <div className="text-center pt-2">
                         <Button
                            type="link"
                            onClick={() => nav('/login')}
                            className="p-0"
                            style={{ fontWeight: 600 }}
                        >
                            Volver al Inicio de Sesión
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AuthForm;
