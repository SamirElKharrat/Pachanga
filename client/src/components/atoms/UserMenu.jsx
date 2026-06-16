import React, { useEffect, useState } from "react";
import { Layout, Menu, Avatar, Image, Dropdown, Typography, Space, Modal, Radio, Switch, Divider, Button, theme, Drawer } from "antd";
import Footer from "./Footer";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
    TeamOutlined,
    UserOutlined,
    FileTextOutlined,
    TrophyOutlined,
    SettingOutlined,
    LogoutOutlined,
    HomeOutlined,
    BgColorsOutlined,
    PlayCircleOutlined,
    ThunderboltOutlined,
    DesktopOutlined,
    MoonOutlined,
    SunOutlined,
    ControlOutlined,
    StarOutlined,
    MenuOutlined,
} from "@ant-design/icons";
import { API } from '../../services/api';
import { showAlert } from './AlertInfo';

const { Content, Sider, Header } = Layout;
const { Text } = Typography;

const getMenuItems = (isAdmin, navigate) => {
    const items = [
        { label: 'Inicio', key: '/', icon: <HomeOutlined />, onClick: () => navigate('/') },
        { label: 'Ligas', key: '/leagues', icon: <TrophyOutlined />, onClick: () => navigate('/leagues') },
        { label: 'Equipos', key: '/teams', icon: <TeamOutlined />, onClick: () => navigate('/teams') },
        { label: 'Predicciones', key: '/predictions', icon: <FileTextOutlined />, onClick: () => navigate('/predictions') },
        // { label: 'Hall of Flame', key: '/hall-of-flame', icon: <StarOutlined />, onClick: () => navigate('/hall-of-flame') },
        { label: '¿Esta Ganando Guille?', key: '/is-guille-winning', icon: <ThunderboltOutlined />, onClick: () => navigate('/is-guille-winning') },
    ];

    if (isAdmin) {
        items.push({
            label: 'Administración',
            key: '/admin',
            icon: <ControlOutlined />,
            onClick: () => navigate('/admin'),
        });
    }

    return items;
};

// ── Component ─────────────────────────────────────────────────────────────────
const UserMenu = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [user, setUser] = useState(null);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Context & settings
    const { themePreference, changeTheme, isLightMode, gifsEnabled, toggleGifs, getAvatarSrc, modoCrazy, changeModoCrazy } = useTheme();

    const handleCrazyModeToggle = (checked) => {
        if (checked) {
            const confirmed = window.confirm('⚠️ ADVERTENCIA DE SALUD VISUAL ⚠️\n\n¿Estás completamente seguro de que quieres volverte loco? Esta acción activará un diseño bizarro, feo, caótico y perjudicial para la vista.');
            if (confirmed) {
                changeModoCrazy(true);
            } else {
                // Return switch to false state
                changeModoCrazy(false);
            }
        } else {
            changeModoCrazy(false);
        }
    };

    const nav = useNavigate();
    const location = useLocation();
    const isAdmin = localStorage.getItem('admin') === 'true';
    const { token } = theme.useToken();

    useEffect(() => {
        API.getUserByToken()
            .then(data => setUser(data))
            .catch(() => {
                showAlert('error', "Sesión expirada");
                nav('/login');
            });

        const handleResize = () => {
            if (window.innerWidth <= 992) setCollapsed(true);
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [nav]);

    const userMenuItems = [
        { key: 'profile', label: 'Mi Perfil', icon: <UserOutlined />, onClick: () => nav('/user') },
        { type: 'divider' },
        {
            key: 'logout',
            label: 'Cerrar sesión',
            icon: <LogoutOutlined />,
            danger: true,
            onClick: async () => {
                try {
                    await API.post('/users/logout');
                } catch (error) {
                    console.error("Logout error:", error);
                }
                localStorage.removeItem('admin');
                showAlert('success', "Has cerrado sesión correctamente");
                nav('/login');
            },
        },
    ];

    const sidebarContent = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Logo */}
            <div
                className="p-4 d-flex align-items-center justify-content-center cursor-pointer logo-container"
                style={{ cursor: 'pointer', flexShrink: 0 }}
                onClick={() => {
                    nav("/");
                    if (isMobile) setDrawerOpen(false);
                }}
            >
                <Image
                    width={(collapsed && !isMobile) ? 32 : 120}
                    preview={false}
                    src="/pachanga_logo_blanco.webp"
                    alt="Pachanga Logo"
                    className="pachanga-logo-img"
                    style={{ filter: token.colorBgBase === '#f8fafc' ? 'invert(1)' : 'none' }}
                />
            </div>

            {/* User Identity */}
            <div style={{ padding: '0 16px', marginBottom: 24, flexShrink: 0 }}>
                <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                    <div
                        className="user-profile-trigger p-2 rounded transition-all"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: token.colorBgContainer,
                            justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
                            cursor: 'pointer',
                            border: `1px solid ${token.colorBorder}`,
                        }}
                    >
                        <Avatar
                            size={(collapsed && !isMobile) ? 28 : 36}
                            icon={<UserOutlined />}
                            src={getAvatarSrc(user?.logo_url)}
                            style={{ flexShrink: 0 }}
                        />
                        {(!(collapsed && !isMobile)) && (
                            <div style={{ marginLeft: 12, overflow: 'hidden' }}>
                                <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                                    {user?.username}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                    {isAdmin ? 'Administrador' : 'Jugador'}
                                </Text>
                            </div>
                        )}
                    </div>
                </Dropdown>
            </div>

            {/* Navigation */}
            <Menu
                theme={isLightMode ? "light" : "dark"}
                mode="inline"
                items={getMenuItems(isAdmin, (path) => {
                    nav(path);
                    if (isMobile) setDrawerOpen(false);
                })}
                selectedKeys={[location.pathname]}
                className="border-0"
                style={{ flex: 1 }}
            />

            {/* Options button at bottom */}
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${token.colorBorder}`, flexShrink: 0 }}>
                <Button
                    type="text"
                    icon={<SettingOutlined />}
                    onClick={() => {
                        setOptionsOpen(true);
                        if (isMobile) setDrawerOpen(false);
                    }}
                    style={{
                        width: '100%',
                        justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
                        color: token.colorTextSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        paddingLeft: (collapsed && !isMobile) ? 0 : 8,
                        transition: 'color 0.2s',
                    }}
                >
                    {(!(collapsed && !isMobile)) && 'Opciones'}
                </Button>
            </div>
        </div>
    );

    return (
        <Layout className="main-layout" style={{ minHeight: '100vh' }}>
            {/* Desktop Sider */}
            {!isMobile && (
                <Sider
                    collapsible
                    collapsed={collapsed}
                    onCollapse={val => setCollapsed(val)}
                    breakpoint="lg"
                    theme={isLightMode ? "light" : "dark"}
                    width={240}
                    style={{
                        overflow: 'auto',
                        height: '100vh',
                        position: 'fixed',
                        left: 0, top: 0, bottom: 0,
                        zIndex: 1000,
                        borderRight: `1px solid ${token.colorBorder}`,
                        boxShadow: '4px 0 10px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {sidebarContent}
                </Sider>
            )}

            {/* Mobile Drawer */}
            {isMobile && (
                <Drawer
                    placement="left"
                    onClose={() => setDrawerOpen(false)}
                    open={drawerOpen}
                    width={280}
                    styles={{ body: { padding: 0, background: token.colorBgContainer } }}
                    closable={false}
                >
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: token.colorBgContainer }}>
                        {sidebarContent}
                    </div>
                </Drawer>
            )}

            {/* Mobile Top Header */}
            {isMobile && (
                <Header
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 56,
                        lineHeight: '56px',
                        padding: '0 16px',
                        background: token.colorBgContainer,
                        borderBottom: `1px solid ${token.colorBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        zIndex: 999,
                    }}
                >
                    <Button
                        type="text"
                        icon={<MenuOutlined style={{ fontSize: 18, color: token.colorText }} />}
                        onClick={() => setDrawerOpen(true)}
                        style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                    <Image
                        width={100}
                        preview={false}
                        src="/pachanga_logo_blanco.webp"
                        alt="Pachanga Logo"
                        className="pachanga-logo-img"
                        style={{ filter: token.colorBgBase === '#f8fafc' ? 'invert(1)' : 'none', cursor: 'pointer' }}
                        onClick={() => nav("/")}
                    />
                    <Avatar
                        size={32}
                        icon={<UserOutlined />}
                        src={getAvatarSrc(user?.logo_url)}
                        onClick={() => nav("/user")}
                        style={{ cursor: 'pointer' }}
                    />
                </Header>
            )}

            {/* ── Options Modal ── */}
            <Modal
                title={<Space><SettingOutlined /><span>Configuración</span></Space>}
                open={optionsOpen}
                onCancel={() => setOptionsOpen(false)}
                footer={null}
                width={420}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 4 }}>

                    {/* Apariencia */}
                    <div style={{ padding: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <BgColorsOutlined style={{ fontSize: 17, color: '#3b82f6' }} />
                            <div>
                                <Text strong style={{ display: 'block', fontSize: 14 }}>Apariencia del sitio web</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>Elige el tema de la interfaz</Text>
                            </div>
                        </div>
                        <Radio.Group
                            value={themePreference}
                            onChange={e => changeTheme(e.target.value)}
                            style={{ display: 'flex', gap: 8 }}
                        >
                            {[
                                { value: 'system', label: 'Sistema', icon: <DesktopOutlined /> },
                                { value: 'dark', label: 'Oscuro', icon: <MoonOutlined /> },
                                { value: 'light', label: 'Claro', icon: <SunOutlined /> },
                            ].map(opt => (
                                <Radio.Button
                                    key={opt.value}
                                    value={opt.value}
                                    style={{
                                        flex: 1,
                                        textAlign: 'center',
                                        height: 38,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        fontSize: 13,
                                    }}
                                >
                                    {opt.icon} {opt.label}
                                </Radio.Button>
                            ))}
                        </Radio.Group>
                    </div>

                    <Divider style={{ margin: 0 }} />

                    {/* Gifs */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <PlayCircleOutlined style={{ fontSize: 17, color: '#10b981' }} />
                            <div>
                                <Text strong style={{ display: 'block', fontSize: 14 }}>Habilitar gifs</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>Controla si se muestran GIFs animados</Text>
                            </div>
                        </div>
                        <Switch
                            checked={gifsEnabled}
                            onChange={v => toggleGifs(v)}
                            checkedChildren="Sí"
                            unCheckedChildren="No"
                        />
                    </div>

                    <Divider style={{ margin: 0 }} />

                    {/* Modo loco */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <ThunderboltOutlined style={{ fontSize: 17, color: '#f59e0b' }} />
                            <div>
                                <Text strong style={{ display: 'block', fontSize: 14 }}>Modo loco</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>Activa efectos visuales extremos</Text>
                            </div>
                        </div>
                        <Switch
                            checked={modoCrazy}
                            onChange={handleCrazyModeToggle}
                            checkedChildren="Sí"
                            unCheckedChildren="No"
                            style={modoCrazy ? { background: '#f59e0b' } : {}}
                        />
                    </div>

                </div>
            </Modal>

            {/* Main content */}
            <Layout
                className="site-layout transition-all"
                style={{ 
                    marginLeft: isMobile ? 0 : (collapsed ? 80 : 240), 
                    paddingTop: isMobile ? 56 : 0, 
                    background: 'transparent' 
                }}
            >
                <Content style={{ margin: 0, minHeight: 'calc(100vh - 70px)' }}>
                    {children}
                </Content>
                <Footer />
            </Layout>
        </Layout>
    );
};

export default UserMenu;
