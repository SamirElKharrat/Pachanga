import { Card, Form, Input, Button, Typography, Image } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { API } from '../../services/api';
import { showAlert } from './AlertInfo';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const AuthForm = ({ method }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();

    const isRegister = method === 'register';

    const onFinish = (values) => {
        const endpoint = isRegister ? 'users/register' : 'users/login';
        values.username = values.username.charAt(0).toUpperCase() + values.username.slice(1);
        setLoading(true);
        API.post(`/${endpoint}`, values)
            .then((data) => {
                if (data.error) {
                    setLoading(false);
                    showAlert('error', data.error);
                }
                API.setToken(data.token);
                nav(isRegister ? '/login' : '/');
                setLoading(false);
                showAlert('success', isRegister ? 'Registrado correctamente' : 'Iniciado sesión correctamente');
            })
            .catch(() => {
                setLoading(false);
                showAlert('error', isRegister ? 'Error al registrar' : 'Error al iniciar sesión');
            });
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#f0f2f5',
                padding: '16px',
                boxSizing: 'border-box'
            }}
        >
            <div style={{
                textAlign: 'center',
                marginBottom: '24px',
                width: '100%',
                maxWidth: '200px'
            }}>
                <Image 
                    preview={false} 
                    src="../pachanga_logo.png" 
                    className="rounded-circle"
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '120px',
                        objectFit: 'contain'
                    }}
                />
            </div>


            <Card
                title={
                    <Title 
                        level={3} 
                        style={{ 
                            margin: 0, 
                            textAlign: 'center',
                            fontSize: 'clamp(1.25rem, 5vw, 1.5rem)'
                        }}
                    >
                        {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
                    </Title>
                }
                size='default'
                style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    width: '100%',
                    maxWidth: isRegister ? '500px' : '400px',
                    boxSizing: 'border-box',
                    margin: '0 auto 40px',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}
                bodyStyle={{
                    padding: 'clamp(16px, 3vw, 24px)'
                }}
            >
                <Form
                    form={form}
                    name={method.toLowerCase()}
                    onFinish={onFinish}
                    layout="vertical"
                >

                    <div style={{ marginBottom: '16px' }}>
                        <Form.Item
                            name="username"
                            label="Usuario"
                            rules={[{ required: true, message: 'Por favor ingresa un usuario' }]}
                            style={{ marginBottom: '16px' }}
                        >
                            <Input 
                                prefix={<UserOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />} 
                                placeholder="Usuario"
                                size="large"
                                style={{ width: '100%' }}
                            />
                        </Form.Item>

                        {isRegister && (
                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[
                                    { 
                                        required: true, 
                                        message: 'Por favor ingresa un email' 
                                    },
                                    {
                                        type: 'email',
                                        message: 'Por favor ingresa un email válido'
                                    }
                                ]}
                                style={{ marginBottom: '16px' }}
                            >
                                <Input 
                                    prefix={<MailOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />} 
                                    placeholder="Email" 
                                    type="email"
                                    size="large"
                                />
                            </Form.Item>
                        )}

                        <Form.Item
                            name="password"
                            label="Contraseña"
                            rules={[
                                { required: true, message: 'Por favor ingresa una contraseña' }
                            ]}
                        >
                            <Input.Password 
                                prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />} 
                                placeholder="Contraseña"
                                size="large"
                            />
                        </Form.Item>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <Form.Item style={{ marginBottom: '16px' }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                loading={loading}
                                style={{
                                    height: '48px',
                                    fontSize: '16px',
                                    fontWeight: 500
                                }}
                            >
                                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
                            </Button>
                        </Form.Item>

                        <div style={{ textAlign: 'center' }}>
                            {!isRegister ? (
                                <Button 
                                    type="link" 
                                    onClick={() => nav('/register')} 
                                    style={{ 
                                        padding: '8px',
                                        height: 'auto',
                                        fontSize: '14px'
                                    }}
                                >
                                    ¿No tienes cuenta? <span style={{ fontWeight: 500 }}>Regístrate</span>
                                </Button>
                            ) : (
                                <Button 
                                    type="link" 
                                    onClick={() => nav('/login')}
                                    style={{ 
                                        padding: '8px',
                                        height: 'auto',
                                        fontSize: '14px'
                                    }}
                                >
                                    ¿Ya tienes cuenta? <span style={{ fontWeight: 500 }}>Inicia sesión</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default AuthForm;
