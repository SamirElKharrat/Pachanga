import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Upload, Button, Spin, Avatar, Typography, Space, Divider } from 'antd';
import { API } from '../../services/api';
import { showAlert } from '../atoms/AlertInfo';
import { LoadingOutlined, UserOutlined, LockOutlined, IdcardOutlined, CameraOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const { Title, Text } = Typography;

export default function User() {
    const [user, setUser]             = useState(null);
    const [loading, setLoading]       = useState(true);
    const [previewImage, setPreviewImage] = useState('');
    const [image, setImage]           = useState('');
    const [activeTab, setActiveTab]   = useState('profile'); // 'profile' | 'security'
    const [form] = Form.useForm();
    const nav = useNavigate();
    const { getAvatarSrc } = useAppTheme();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                const userData = await API.getUserByToken();
                setUser(userData);
                setPreviewImage(userData.logo_url || '');
                form.setFieldsValue({
                    username: userData.username,
                    email: userData.email,
                });
            } catch (error) {
                showAlert('error', error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [form]);

    const handleProfileUpdate = async (values) => {
        try {
            setLoading(true);
            if (image) {
                const formData = new FormData();
                formData.append('file', image);
                const response = await API.post('/upload/', formData);
                values.logo_url = response.url;
            }
            const updatedUser = await API.put('/users/update/' + user.id, values);
            setUser(updatedUser);
            if (values.logo_url) setPreviewImage(values.logo_url);
            showAlert('success', 'Perfil actualizado correctamente');
        } catch (error) {
            showAlert('error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (info) => {
        const imageUrl = URL.createObjectURL(info.file.originFileObj);
        setPreviewImage(imageUrl);
        setImage(info.file.originFileObj);
    };

    const handlePasswordChange = async (values) => {
        try {
            setLoading(true);
            await API.put('/users/changePassword/' + user.id, values);
            showAlert('success', 'Contraseña cambiada correctamente');
            API.setToken('');
            localStorage.removeItem('admin');
            nav('/login');
        } catch (error) {
            showAlert('error', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: '16px 12px 40px', maxWidth: 580, margin: '0 auto' }}>
            <Title level={3} style={{ marginBottom: 20 }}>Ajustes de Cuenta</Title>

            {/* ── Tab switcher ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[
                    { key: 'profile', label: 'Información Personal', icon: <IdcardOutlined /> },
                    { key: 'security', label: 'Seguridad', icon: <LockOutlined /> },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1,
                            padding: '10px 8px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            background: activeTab === tab.key
                                ? 'rgba(59,130,246,0.15)'
                                : 'rgba(255,255,255,0.04)',
                            color: activeTab === tab.key ? '#3b82f6' : 'inherit',
                            borderBottom: activeTab === tab.key
                                ? '2px solid #3b82f6'
                                : '2px solid transparent',
                            transition: 'all 0.2s',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Profile tab ── */}
            {activeTab === 'profile' && (
                <Card>
                    {/* Avatar centered */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <Avatar
                                src={getAvatarSrc(previewImage)}
                                icon={<UserOutlined />}
                                size={88}
                                style={{ border: '3px solid rgba(59,130,246,0.4)' }}
                            />
                            <Upload
                                name="logo_url"
                                showUploadList={false}
                                beforeUpload={(file) => {
                                    const isImage = file.type.startsWith('image/');
                                    if (!isImage) showAlert('error', 'Solo puedes subir imágenes!');
                                    return isImage || Upload.LIST_IGNORE;
                                }}
                                onChange={handleImageChange}
                                accept="image/*"
                            >
                                <button
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: '#3b82f6',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 13,
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    <CameraOutlined />
                                </button>
                            </Upload>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11, marginTop: 8 }}>
                            JPG, PNG o GIF · Toca el icono de cámara para cambiar
                        </Text>
                    </div>

                    <Form form={form} layout="vertical" onFinish={handleProfileUpdate}>
                        <Form.Item
                            name="username"
                            label="Nombre de Usuario"
                            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                        >
                            <Input size="large" prefix={<UserOutlined style={{ color: '#94a3b8' }} />} />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, type: 'email', message: 'Ingresa un email válido' }]}
                        >
                            <Input size="large" prefix={<UserOutlined style={{ color: '#94a3b8' }} />} />
                        </Form.Item>

                        <Button type="primary" size="large" htmlType="submit" loading={loading} block>
                            Actualizar Perfil
                        </Button>
                    </Form>
                </Card>
            )}

            {/* ── Security tab ── */}
            {activeTab === 'security' && (
                <Card>
                    <Form layout="vertical" onFinish={handlePasswordChange}>
                        <Form.Item
                            name="currentPassword"
                            label="Contraseña Actual"
                            rules={[{ required: true, message: 'Ingresa tu contraseña actual' }]}
                        >
                            <Input.Password size="large" prefix={<LockOutlined style={{ color: '#94a3b8' }} />} />
                        </Form.Item>

                        <Form.Item
                            name="newPassword"
                            label="Nueva Contraseña"
                            rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}
                        >
                            <Input.Password size="large" prefix={<LockOutlined style={{ color: '#94a3b8' }} />} />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            label="Confirmar Nueva Contraseña"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Confirma tu nueva contraseña' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                        return Promise.reject('Las contraseñas no coinciden');
                                    },
                                }),
                            ]}
                        >
                            <Input.Password size="large" prefix={<LockOutlined style={{ color: '#94a3b8' }} />} />
                        </Form.Item>

                        <Button type="primary" size="large" htmlType="submit" loading={loading} block danger>
                            Cambiar Contraseña
                        </Button>
                    </Form>
                </Card>
            )}
        </div>
    );
}
