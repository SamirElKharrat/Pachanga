import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Input, Upload, Button, Spin, Avatar, Typography, Flex } from 'antd';
import { UserOutlined, LockOutlined, CameraOutlined, MailOutlined, TrophyOutlined, EditOutlined, CheckOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { API } from '../../services/api';
import { showAlert } from '../atoms/AlertInfo';
import Inventory from '../atoms/cosmetics/Inventory';
import ProfileCards from '../atoms/cards/ProfileCards';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import CoinHistory from '../atoms/CoinHistory';
import { CoinIcon } from '../atoms/CoinBalance';
import useCoins, { refreshCoins } from '../../hooks/useCoins';
import { useEquipped } from '../../hooks/useCosmetics';
import { CosmeticFrame, CosmeticName, CosmeticTitle } from '../atoms/cosmetics/Cosmetic';
import { Banner } from '../atoms/cosmetics/Banner';
import '../atoms/css/profile.css';

const { Text } = Typography;

/** Las pestañas y su hash. #seguridad (el de antes) lleva a Ajustes. */
const TABS = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'inventario', label: 'Inventario' },
    { key: 'cartas', label: 'Cartas' },
    { key: 'monedas', label: 'Monedas' },
    { key: 'ajustes', label: 'Ajustes' },
];
const tabFromHash = (hash) => {
    const h = (hash || '').replace('#', '');
    if (h === 'seguridad') return 'ajustes';
    return TABS.some(t => t.key === h) ? h : null;
};

/**
 * El perfil: una cabecera de jugador (portada, foto con su marco, nombre con su color
 * y título, y tus cifras) y cuatro pestañas: Resumen, Inventario, Monedas y Ajustes
 * (tus datos y la contraseña).
 *
 * La pestaña va en el hash (#inventario, #monedas, #ajustes), así que los enlaces de
 * la píldora de monedas y de la tienda llevan directos a la suya.
 */
export default function User() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [leagues, setLeagues] = useState(null);
    const [hall, setHall] = useState(null);
    const location = useLocation();
    const nav = useNavigate();
    const [activeTab, setActiveTab] = useState(tabFromHash(location.hash) || 'resumen');
    const [form] = Form.useForm();
    const { getAvatarSrc } = useAppTheme();
    const wallet = useCoins();
    const equipped = useEquipped(user?.id);

    // Pinchar la píldora de monedas (o «Mi perfil») estando ya aquí solo cambia el hash.
    useEffect(() => {
        setActiveTab(tabFromHash(location.hash) || 'resumen');
    }, [location.hash]);

    useEffect(() => {
        if (activeTab === 'monedas') refreshCoins({ quiet: true });
    }, [activeTab]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const userData = await API.getUserByToken();
                setUser(userData);
                form.setFieldsValue({ email: userData.email });
            } catch (error) {
                showAlert('error', error.message);
            } finally {
                setLoading(false);
            }
        })();
        // Las cifras de la cabecera. Si fallan, la cabecera sale sin ellas.
        API.get('/leagueParticipations/get/').then(lp => setLeagues(Array.isArray(lp) ? new Set(lp.map(p => p.league_id)).size : null)).catch(() => setLeagues(null));
        API.get('/hall/get').then(h => setHall(h?.players || [])).catch(() => setHall([]));
        if (wallet.status === 'idle') refreshCoins({ quiet: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form]);

    const me = useMemo(() => (hall && user ? hall.find(p => p.id === user.id) : null), [hall, user]);
    const titles = me?.wins ?? (hall ? 0 : null);

    const goTab = (key) => {
        setActiveTab(key);
        nav({ hash: key === 'resumen' ? '' : `#${key}` }, { replace: true });
    };

    /**
     * Guarda unos campos del usuario y avisa al resto de la web (el menú lateral
     * enseña tu nombre y tu foto) para que se actualice sin recargar.
     */
    const saveUser = async (fields) => {
        const updated = await API.put('/users/update/' + user.id, fields);
        setUser(updated);
        window.dispatchEvent(new CustomEvent('pachanga:user-updated', { detail: updated }));
        return updated;
    };

    // El email, desde Ajustes.
    const handleProfileUpdate = async (values) => {
        try {
            setSaving(true);
            await saveUser({ email: values.email });
            showAlert('success', 'Email actualizado');
        } catch (error) {
            showAlert('error', error?.response?.data?.error || error.message);
        } finally {
            setSaving(false);
        }
    };

    // La foto, desde la cabecera: se sube y se guarda en cuanto la eliges.
    const handlePhoto = async (file) => {
        if (!file.type.startsWith('image/')) {
            showAlert('error', 'Solo puedes subir imágenes');
            return false;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await API.post('/upload/', formData);
            await saveUser({ logo_url: response.url });
            showAlert('success', 'Foto cambiada');
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo cambiar la foto');
        } finally {
            setUploading(false);
        }
        return false; // la subida la hacemos nosotros, no Antd
    };

    // El nombre, desde la cabecera.
    const startEditName = () => { setNameDraft(user?.username || ''); setEditingName(true); };
    const saveName = async () => {
        const name = nameDraft.trim();
        if (!name) { showAlert('error', 'El nombre no puede ir vacío'); return; }
        if (name === user.username) { setEditingName(false); return; }
        setSavingName(true);
        try {
            await saveUser({ username: name });
            setEditingName(false);
            showAlert('success', 'Nombre cambiado');
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo cambiar el nombre');
        } finally {
            setSavingName(false);
        }
    };

    const handlePasswordChange = async (values) => {
        try {
            setSaving(true);
            await API.put('/users/changePassword/' + user.id, values);
            showAlert('success', 'Contraseña cambiada correctamente');
            try {
                await API.post('/users/logout');
            } catch (err) {
                console.error('Logout error', err);
            }
            localStorage.removeItem('admin');
            nav('/login');
        } catch (error) {
            showAlert('error', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading && !user) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '60vh' }}>
                <Spin size="large" />
            </Flex>
        );
    }

    const isAdmin = localStorage.getItem('admin') === 'true';
    const lastMove = (wallet.movements || []).find(m => m.amount !== 0);
    const wearsSomething = Boolean(equipped.frame || equipped.color || equipped.title);

    return (
        <div className="profile-page">
            {/* ── Cabecera de jugador ── */}
            <div className="profile-hero">
                <div className="profile-cover cos-banner-host">
                    {/* Tu banner sustituye a la portada de siempre */}
                    {equipped.banner && <Banner id={equipped.banner} className="cos-banner-bg" />}
                    {(leagues != null || titles != null) && (
                        <span className="profile-cover-tag">
                            {[leagues != null && `${leagues} ${leagues === 1 ? 'liga' : 'ligas'}`, titles != null && `${titles} ${titles === 1 ? 'título' : 'títulos'}`].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </div>
                <div className="profile-head">
                    <div className="profile-avatar">
                        <CosmeticFrame userId={user?.id}>
                            <Avatar src={getAvatarSrc(user?.logo_url)} icon={<UserOutlined />} size={96} />
                        </CosmeticFrame>
                        <Upload showUploadList={false} beforeUpload={handlePhoto} accept="image/*" disabled={uploading}>
                            <button type="button" className="profile-photo-btn" aria-label="Cambiar foto" title="Cambiar foto (JPG, PNG o GIF)">
                                {uploading ? <LoadingOutlined /> : <CameraOutlined />}
                            </button>
                        </Upload>
                    </div>
                    <div className="profile-who">
                        {editingName ? (
                            <div className="profile-name-edit">
                                <Input
                                    autoFocus
                                    size="large"
                                    value={nameDraft}
                                    maxLength={30}
                                    onChange={e => setNameDraft(e.target.value)}
                                    onPressEnter={saveName}
                                    onKeyDown={e => { if (e.key === 'Escape') setEditingName(false); }}
                                    aria-label="Nombre de usuario"
                                    disabled={savingName}
                                />
                                <Button type="primary" icon={<CheckOutlined />} onClick={saveName} loading={savingName} aria-label="Guardar nombre" />
                                <Button icon={<CloseOutlined />} onClick={() => setEditingName(false)} disabled={savingName} aria-label="Cancelar" />
                            </div>
                        ) : (
                            <div className="profile-name-row">
                                <h1 className="profile-name"><CosmeticName userId={user?.id}>{user?.username}</CosmeticName></h1>
                                <button type="button" className="profile-edit-btn" onClick={startEditName} aria-label="Cambiar nombre" title="Cambiar nombre">
                                    <EditOutlined />
                                </button>
                            </div>
                        )}
                        <div className="profile-sub">
                            <CosmeticTitle userId={user?.id} style={{ fontSize: 12 }} />
                            {!equipped.title && <span>{isAdmin ? 'Administrador' : 'Jugador'}</span>}
                        </div>
                    </div>
                    <div className="profile-chips">
                        {wallet.balance != null && <button type="button" onClick={() => goTab('monedas')}><CoinIcon size={13} /> {wallet.balance} {wallet.balance === 1 ? 'moneda' : 'monedas'}</button>}
                        {leagues != null && <span>{leagues} {leagues === 1 ? 'liga' : 'ligas'}</span>}
                        {titles != null && <span><TrophyOutlined /> {titles} {titles === 1 ? 'título' : 'títulos'}</span>}
                    </div>
                </div>
            </div>

            {/* ── Pestañas ── */}
            <div className="profile-tabs" role="tablist">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === t.key}
                        className={activeTab === t.key ? 'on' : ''}
                        onClick={() => goTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Resumen ── */}
            {activeTab === 'resumen' && (
                <div className="profile-overview">
                    <Card className="profile-card" onClick={() => goTab('monedas')} hoverable>
                        <div className="profile-label">Monedas</div>
                        <div className="profile-big">{wallet.balance ?? '—'}<small> / {wallet.cap}</small></div>
                        <Text type="secondary" style={{ fontSize: 12.5 }}>
                            {lastMove ? `${lastMove.amount > 0 ? '+' : '−'}${Math.abs(lastMove.amount)} · ${lastMove.label}` : 'Aún no has movido monedas'}
                        </Text>
                    </Card>
                    <Card className="profile-card" onClick={() => goTab('inventario')} hoverable>
                        <div className="profile-label">Lo que llevas puesto</div>
                        <div className="profile-wear">
                            <CosmeticFrame userId={user?.id}>
                                <Avatar src={getAvatarSrc(user?.logo_url)} icon={<UserOutlined />} size={40} />
                            </CosmeticFrame>
                            <div style={{ minWidth: 0 }}>
                                <div className="profile-wear-name"><CosmeticName userId={user?.id}>{user?.username}</CosmeticName></div>
                                {equipped.title
                                    ? <CosmeticTitle userId={user?.id} />
                                    : <Text type="secondary" style={{ fontSize: 12 }}>{wearsSomething ? 'Sin título' : 'Sin marco, color ni título'}</Text>}
                            </div>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12.5 }}>Cámbialo en tu inventario</Text>
                    </Card>
                    <Card className="profile-card" onClick={() => nav('/hall-of-flame')} hoverable>
                        <div className="profile-label">Palmarés</div>
                        <div className="profile-big">{titles ?? '—'}</div>
                        <Text type="secondary" style={{ fontSize: 12.5 }}>
                            {titles
                                ? `${titles === 1 ? 'título' : 'títulos'}${leagues != null ? ` en ${leagues} ${leagues === 1 ? 'liga' : 'ligas'}` : ''}`
                                : `Aún sin títulos${leagues != null ? ` en ${leagues} ${leagues === 1 ? 'liga' : 'ligas'}` : ''}`}
                        </Text>
                        {me?.trophies?.length > 0 && (
                            <ul className="profile-trophies">
                                {me.trophies.slice(0, 3).map(t => <li key={t.id}><TrophyOutlined /> {t.competition_name}</li>)}
                                {me.trophies.length > 3 && <li className="more">y {me.trophies.length - 3} más</li>}
                            </ul>
                        )}
                    </Card>
                </div>
            )}

            {/* ── Inventario ── */}
            {activeTab === 'inventario' && <Inventory user={user} preview={false} />}

            {/* ── Cartas: las que tienes en cada liga y lo que has jugado ── */}
            {activeTab === 'cartas' && <ProfileCards />}

            {/* ── Monedas ── */}
            {activeTab === 'monedas' && (
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

            {/* ── Ajustes: tus datos y la contraseña ── */}
            {activeTab === 'ajustes' && (
                <Card className="profile-settings">
                    <h2 className="profile-section-title">Email</h2>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12.5, margin: '-6px 0 14px' }}>
                        El nombre y la foto se cambian arriba, en tu cabecera.
                    </Text>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleProfileUpdate}
                        initialValues={{ email: user?.email }}
                    >
                        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Pon un email válido' }]}>
                            <Input size="large" prefix={<MailOutlined style={{ color: 'var(--text-dim)' }} />} />
                        </Form.Item>
                        <Button type="primary" size="large" htmlType="submit" loading={saving} block>
                            Guardar email
                        </Button>
                    </Form>

                    <div className="profile-divider" />

                    <h2 className="profile-section-title">Contraseña</h2>
                    <Form layout="vertical" onFinish={handlePasswordChange}>
                        <Form.Item name="currentPassword" label="Contraseña actual" rules={[{ required: true, message: 'Pon tu contraseña actual' }]}>
                            <Input.Password size="large" prefix={<LockOutlined style={{ color: 'var(--text-dim)' }} />} />
                        </Form.Item>
                        <Form.Item name="newPassword" label="Contraseña nueva" rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}>
                            <Input.Password size="large" prefix={<LockOutlined style={{ color: 'var(--text-dim)' }} />} />
                        </Form.Item>
                        <Form.Item
                            name="confirmPassword"
                            label="Repite la contraseña nueva"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Repite la contraseña nueva' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                        return Promise.reject(new Error('Las contraseñas no coinciden'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password size="large" prefix={<LockOutlined style={{ color: 'var(--text-dim)' }} />} />
                        </Form.Item>
                        <Button type="primary" size="large" htmlType="submit" loading={saving} block danger>
                            Cambiar contraseña
                        </Button>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                            Al cambiarla se cierra la sesión y tendrás que volver a entrar.
                        </Text>
                    </Form>
                </Card>
            )}
        </div>
    );
}
