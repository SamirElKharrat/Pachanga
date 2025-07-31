import React, { useEffect, useState } from "react";
import { Layout, Menu, Avatar, Image, Space, Button, Dropdown } from "antd";
import Footer from "./Footer";
import { useNavigate, useLocation } from "react-router-dom";
import { TeamOutlined, UserOutlined, FileTextOutlined, TrophyOutlined, SettingOutlined, LogoutOutlined, HomeOutlined } from "@ant-design/icons";
import { API } from '../../services/api';
const { Content, Sider } = Layout;
import { showAlert } from './AlertInfo';

const menuItems = (isAdmin, navigate) => {
    const menu = [
        {
            label: 'Inicio',
            key: '/',
            icon: <HomeOutlined />,
            onClick: () => navigate('/', { state: { isAdmin: isAdmin } })
        },
        {
            label: 'Ligas',
            key: '/leagues',
            icon: <TrophyOutlined />,
            onClick: () => navigate('/leagues', { state: { isAdmin: isAdmin } })
        },
        {
            label: 'Equipos',
            key: '/teams',
            icon: <TeamOutlined />,
            onClick: () => navigate('/teams', { state: { isAdmin: isAdmin } })
        },
        {
            label: 'Predicciones',
            key: '/predictions',
            icon: <FileTextOutlined />,
            onClick: () => navigate('/predictions', { state: { isAdmin: isAdmin } })
        }
    ];
    if (isAdmin) {
        menu.push({
            label: 'Admin',
            key: '/admin',
            icon: <SettingOutlined />,
            onClick: () => navigate('/admin', { state: { isAdmin: isAdmin } })
        });
    }
    return menu;
}

const UserMenu = ({ children }) => {
    const [collapse, setCollapse] = useState(false);
    const [user, setUser] = useState(null);
    const nav = useNavigate();
    const location = useLocation();

    const onCollapse = () => {
        setCollapse(!collapse);
    };

    useEffect(() => {
        API.getUserByToken()
            .then((data) => {
                setUser(data);
            })
            .catch(() => {
                API.setToken('');
                showAlert('error', "Sesion expirada")
                nav('/login')
            });

        const handleResize = () => {
            setCollapse(window.innerWidth <= 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [nav]);

    return (
        <>
            <Layout>
                <Sider
                    collapsible
                    collapsed={collapse}
                    onCollapse={onCollapse}
                    width={200}
                    style={{
                        height: "100%",
                        position: "fixed",
                        top: 0,
                        paddingTop: 20,
                        paddingBottom: 20,

                    }}
                >
                    <Space direction="vertical" align="center" className="w-100">
                        <Image style={{ cursor: "pointer", filter: "brightness(0.5) invert(0.7)" }} onClick={() => { nav("/", { state: { isAdmin: location.state?.isAdmin || false } }) }} width={collapse ? 50 : 120} height={collapse ? 50 : 120} preview={false} src="../pachanga_logo.png" className="rounded-circle" />
                        <Space style={{ marginTop: 20, marginBottom: 20, marginLeft: collapse ? 0 : 10 }}>
                            <Dropdown
                                menu={{
                                    items: [
                                        {
                                            key: '1',
                                            label: 'Perfil',
                                            icon: <UserOutlined />,
                                            onClick: () => {
                                                nav('/user')
                                            }
                                        },
                                        {
                                            key: '2',
                                            label: 'Cerrar sesión',
                                            icon: <LogoutOutlined />,
                                            onClick: () => {
                                                API.setToken('');
                                                localStorage.removeItem('admin');
                                                showAlert('success', "Sesión cerrada con exito")
                                                nav('/login')
                                            }
                                        },
                                    ],
                                }}
                                trigger={['click']}
                            >
                                {collapse ? (

                                    <a onClick={(e) => { e.preventDefault(); }}>
                                        <Space>
                                            <Avatar style={{ cursor: "pointer" }} size={collapse ? "small" : "large"} icon={!user || !user.logo_url ? <UserOutlined /> : null} src={user && user.logo_url ? `${user.logo_url}` : null} className="mr-2" />
                                        </Space>
                                    </a>

                                ) : (
                                    <div className="d-flex align-items-center">
                                        <Avatar style={{ cursor: "pointer" }} size="large" icon={!user || !user.logo_url ? <UserOutlined /> : null} src={user && user.logo_url ? `${user.logo_url}` : null} className="mr-2" />
                                        <div className="d-flex mx-3">
                                            <span className="text-white">{user && user.username}</span>
                                        </div>
                                    </div>
                                )}
                            </Dropdown>
                        </Space>
                    </Space>
                    <Menu
                        theme="dark"
                        mode="inline"
                        items={menuItems(localStorage.getItem('admin') || false, nav)}
                        style={{ marginTop: 20 }}
                        selectedKeys={[location.pathname]}
                        defaultActiveFirst
                        defaultSelectedKeys={['/']}
                    />

                    <div className="d-flex justify-content-center">
                        <Button type="primary" icon={<SettingOutlined />} style={{ position: "absolute", bottom: 60 }}>
                            {collapse ? "" : "Opciones"}
                        </Button>
                    </div>
                </Sider>
                <Layout
                    style={{
                        marginLeft: collapse ? 80 : 200,
                        transition: "margin-left 0.3s ease",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "100vh"
                    }}
                >
                    <Content className="p-3 h-100" style={{ padding: 24, background: "#fff", flex: 1 }}>
                        {children}
                    </Content>
                    <Footer />
                </Layout>

            </Layout>

        </>
    );
};

export default UserMenu;
