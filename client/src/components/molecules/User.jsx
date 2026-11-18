import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Upload, Button, Spin, Avatar, Typography, Space, Divider, Flex } from 'antd';
import { API } from '../../services/api';
import { showAlert } from '../atoms/AlertInfo';
import { LoadingOutlined, UserOutlined, LockOutlined, IdcardOutlined, CameraOutlined, InboxOutlined } from '@ant-design/icons';
import Inventory from '../atoms/cosmetics/Inventory';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import CoinHistory from '../atoms/CoinHistory';
import { CoinIcon } from '../atoms/CoinBalance';
import useCoins, { refreshCoins } from '../../hooks/useCoins';
import { useEquipped } from '../../hooks/useCosmetics';
import { CosmeticFrame, CosmeticName, CosmeticTitle } from '../atoms/cosmetics/Cosmetic';

const { Title, Text } = Typography;

export default function User() {
    const [user, setUser]             = useState(null);
    const hasFrame = Boolean(useEquipped(user?.id).frame);
    const [loading, setLoading]       = useState(true);
    const [previewImage, setPreviewImage] = useState('');
    const [image, setImage]           = useState('');
    const location = useLocation();
    // La píldora de monedas del menú trae aquí con #monedas.
    // Y #inventario, a lo desbloqueado de la tienda.
    const tabFromHash = (hash) => (hash === '#monedas' ? 'coins' : hash === '#inventario' ? 'inventory' : null);
    const [activeTab, setActiveTab]   = useState(tabFromHash(location.hash) || 'profile'); // 'profile' | 'inventory' | 'security' | 'coins'
    const [form] = Form.useForm();
    const nav = useNavigate();
    const { getAvatarSrc } = useAppTheme();
    const wallet = useCoins();

    // Ya en el perfil, pinchar otra vez la píldora solo cambia el hash.
    useEffect(() => {
        const tab = tabFromHash(location.hash);
        if (tab) setActiveTab(tab);
    }, [location.hash]);

    // Al abrir la pestaña, el historial al día (sin repetir avisos).
    useEffect(() => {
        if (activeTab === 'coins') refreshCoins({ quiet: true });
    }, [activeTab]);

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
            try {
                await API.post('/users/logout');
            } catch (err) {
                console.error("Logout error", err);
            }
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
            <Flex align="center" justify="center" style={{ minHeight: '60vh' }}>
                <Spin size="large" />
            </Flex>
        );
    }

    return (
        <Flex vertical style={{ padding: '16px 12px 40px', maxWidth: 580, margin: '0 auto' }}>
            <Title level={3} style={{ marginBottom: 20 }}>Ajustes de Cuenta</Title>

            {/* ── Tab switcher ── */}
            <Flex gap={8} wrap="wrap" style={{ marginBottom: 20 }}>
                {[
                    { key: 'profile', label: 'Información Personal', icon: <IdcardOutlined /> },
                    { key: 'inventory', label: 'Inventario', icon: <InboxOutlined /> },
                    { key: 'security', label: 'Seguridad', icon: <LockOutlined /> },
                    { key: 'coins', label: 'Monedas', icon: <CoinIcon size={13} /> },
                ].map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        aria-pressed={activeTab === tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: '1 1 120px',
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
                                ? 'rgba(var(--accent-rgb),0.15)'
                                : 'rgba(var(--tint),0.04)',
                            color: activeTab === tab.key ? 'var(--accent)' : 'inherit',
                            borderBottom: activeTab === tab.key
                                ? '2px solid var(--accent)'
                                : '2px solid transparent',
                            transition: 'all 0.2s',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </Flex>

            {/* ── Profile tab ── */}
            {activeTab === 'profile' && (
                <Card>
                    {/* Avatar centered */}
                    <Flex vertical align="center" style={{ marginBottom: 28 }}>
                        <Flex style={{ position: 'relative', display: 'inline-block' }}>
                            {hasFrame ? (
                                <CosmeticFrame userId={user?.id}>
                                    <Avatar src={getAvatarSrc(previewImage)} icon={<UserOutlined />} size={88} />
                                </CosmeticFrame>
                            ) : (
                                <Avatar
                                    src={getAvatarSrc(previewImage)}
                                    icon={<UserOutlined />}
                                    size={88}
                                    style={{ border: '3px solid rgba(var(--accent-rgb),0.4)' }}
                                />
                            )}
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
                                        background: 'var(--accent)',
                                        color: 'var(--on-accent)',
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
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 11, marginTop: 8 }}>
                            JPG, PNG o GIF · Toca el icono de cámara para cambiar
                        </Text>
                        {/* Lo que llevas puesto de la tienda */}
                        <Flex vertical align="center" gap={2} style={{ marginTop: 12 }}>
                            <Text strong style={{ fontSize: 16 }}>
                                <CosmeticName userId={user?.id}>{user?.username}</CosmeticName>
                            </Text>
                            <CosmeticTitle userId={user?.id} style={{ fontSize: 12 }} />
                            <Button type="link" size="small" onClick={() => setActiveTab('inventory')} style={{ padding: 0, height: 'auto', fontSize: 12 }}>
                                Cambiar marco, color o título
                            </Button>
                        </Flex>
                    </Flex>

                    <Form form={form} layout="vertical" onFinish={handleProfileUpdate}>
                        <Form.Item
                            name="username"
                            label="Nombre de Usuario"
                            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                        >
                            <Input size="large" prefix={<UserOutlined style={{ color: 'var(--text-dim)' }} />} />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, type: 'email', message: 'Ingresa un email válido' }]}
                        >
                            <Input size="large" prefix={<UserOutlined style={{ color: 'var(--text-dim)' }} />} />
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
                            <Input.Password size="large" prefix={<LockOutlined style={{ color: 'var(--text-dim)' }} />} />
                        </Form.Item>

                        <Form.Item
                            name="newPassword"
                            label="Nueva Contraseña"
                            rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}
                        >
                            <Input.Password size="large" prefix={<LockOutlined style={{ color: 'var(--text-dim)' }} />} />
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
                            <Input.Password size="large" prefix={<LockOutlined style={{ color: 'var(--text-dim)' }} />} />
                        </Form.Item>

                        <Button type="primary" size="large" htmlType="submit" loading={loading} block danger>
                            Cambiar Contraseña
                        </Button>
                    </Form>
                </Card>
            )}

            {/* ── Inventario: lo desbloqueado de la tienda ── */}
            {activeTab === 'inventory' && <Inventory user={user} />}

            {/* ── Monedas ── */}
            {activeTab === 'coins' && (
                <Card id="monedas">
                    <CoinHistory
                        balance={wallet.balance}
                        cap={wallet.cap}
                        movements={wallet.movements}
                        howToEarn={wallet.howToEarn}
                        loading={wallet.status !== 'ready'}
                    />
                </Card>
            )}
        </Flex>
    );
}
