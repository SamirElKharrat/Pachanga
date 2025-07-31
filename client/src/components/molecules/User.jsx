import React, { useEffect, useState } from 'react';
import { Tabs, Card, Form, Input, Upload, Button, Spin } from 'antd';
import { API } from '../../services/api';
import { showAlert } from '../atoms/AlertInfo';
import { LoadingOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;

const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
        showAlert('error', '¡Solo puedes subir imagenes o gifs!');
        return Upload.LIST_IGNORE;
    }
    return true;
};

export default function User() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState('');
    const [image, setImage] = useState('');
    const [form] = Form.useForm();
    const nav = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userData = await API.getUserByToken();
                setUser(userData);
                setPreviewImage(userData.logo_url || ''); // Establece la imagen inicial
                form.setFieldsValue({
                    username: userData.username,
                    email: userData.email,
                    logo_url: userData.logo_url ? [{
                        uid: '-1',
                        name: 'imagen',
                        status: 'done',
                        url: userData.logo_url,
                    }] : []
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
            setPreviewImage(values.logo_url || '');
            showAlert('success', 'Perfil actualizado correctamente');
        } catch (error) {
            showAlert('error', error.message);
        }
        finally {
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
            await API.put('/users/changePassword/' + user.id, values);
            showAlert('success', 'Contraseña cambiada correctamente');
            localStorage.removeItem('token');
            localStorage.removeItem('admin');
            nav('/login');
        } catch (error) {
            showAlert('error', error.message);
        }
    };

    return (
        <div className="container mt-5">
            <Card title="Mi Perfil">
                <Tabs defaultActiveKey="1" tabPosition="left">
                    <TabPane tab="Perfil" key="1">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleProfileUpdate}
                            style={{ maxWidth: 600 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                                <Upload
                                    name="logo_url"
                                    listType="picture-card"
                                    className="avatar-uploader"
                                    showUploadList={false}
                                    beforeUpload={beforeUpload}
                                    onChange={handleImageChange}
                                    accept="image/*"
                                >
                                    {previewImage ? (
                                        <img
                                            src={previewImage}
                                            alt="avatar"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                        />
                                    ) : (
                                        <div>
                                            {loading ? <LoadingOutlined /> : <UserOutlined />}
                                            <div style={{ marginTop: 8 }}>Subir</div>
                                        </div>
                                    )}
                                </Upload>
                                <div style={{ marginLeft: '20px', flex: 1 }}>
                                    <Form.Item
                                        name="username"
                                        label="Nombre de Usuario"
                                        rules={[{ required: true, message: 'Por favor ingrese un nombre de usuario' }]}
                                    >
                                        <Input placeholder="Nombre de Usuario" />
                                    </Form.Item>
                                    <Form.Item
                                        name="email"
                                        label="Email"
                                        rules={[{ required: true, message: 'Por favor ingrese un email' }]}
                                    >
                                        <Input placeholder="Email" type="email" />
                                    </Form.Item>
                                </div>
                            </div>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading}>
                                    {loading ? <Spin /> : 'Guardar Cambios'}
                                </Button>
                            </Form.Item>
                        </Form>
                    </TabPane>
                    <TabPane tab="Cambio Contraseña" key="2">
                        <Form
                            layout="vertical"
                            onFinish={handlePasswordChange}
                            style={{ maxWidth: 600 }}
                        >
                            <Form.Item
                                name="currentPassword"
                                label="Contraseña Actual"
                                rules={[{ required: true, message: 'Por favor ingrese su contraseña actual' }]}
                            >
                                <Input.Password placeholder="Contraseña Actual" />
                            </Form.Item>
                            <Form.Item
                                name="newPassword"
                                label="Nueva Contraseña"
                                rules={[{ required: true, message: 'Por favor ingrese una nueva contraseña' }]}
                            >
                                <Input.Password placeholder="Nueva Contraseña" />
                            </Form.Item>
                            <Form.Item
                                name="confirmPassword"
                                label="Confirmar Nueva Contraseña"
                                dependencies={['newPassword']}
                                rules={[
                                    { required: true, message: 'Por favor confirme la nueva contraseña' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('newPassword') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject('Las contraseñas no coinciden');
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password placeholder="Confirmar Nueva Contraseña" />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading}>
                                    {loading ? <Spin /> : 'Cambiar Contraseña'}
                                </Button>
                            </Form.Item>
                        </Form>
                    </TabPane>
                </Tabs>
            </Card>
        </div>
    );
}
