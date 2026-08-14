import React, { useEffect, useState } from 'react';
import { Typography, Avatar, Skeleton, Modal, Form, Input, Select, Button, Popconfirm, Empty, Space, InputNumber, Tooltip } from 'antd';
import { UserOutlined, PlusOutlined, CloseOutlined, ArrowRightOutlined, BookOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { API } from '../../services/api';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import { showAlert } from '../atoms/AlertInfo';
import './css/PachangaStanding.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const PachangaStanding = () => {
    const [standings, setStandings] = useState([]);
    const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // Rules state
    const [rulesList, setRulesList] = useState([]);
    const [rulesLoading, setRulesLoading] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [isRuleFormModalOpen, setIsRuleFormModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [ruleSubmitting, setRuleSubmitting] = useState(false);

    // Points Form Modal
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [form] = Form.useForm();
    const [ruleForm] = Form.useForm();
    const { getAvatarSrc } = useAppTheme();

    // Check admin status
    useEffect(() => {
        const adminFlag = localStorage.getItem('admin') === 'true';
        setIsAdmin(adminFlag);

        API.getUserByToken()
            .then(user => {
                if (user?.Roles?.some(r => r.name === 'admin')) {
                    setIsAdmin(true);
                }
            })
            .catch(() => { });
    }, []);

    // Load standings data
    const fetchStandings = async (year = selectedYear) => {
        try {
            setLoading(true);
            const res = await API.get(`/pachanga/standings?year=${year}`);
            setStandings(res.standings || []);
            if (res.availableYears && res.availableYears.length > 0) {
                setAvailableYears(res.availableYears);
            }
        } catch (error) {
            console.error("Error loading Pachanga standings:", error);
            showAlert('error', 'No se pudieron cargar los datos de la clasificación');
        } finally {
            setLoading(false);
        }
    };

    // Load rules from DB
    const fetchRules = async (year = selectedYear) => {
        try {
            setRulesLoading(true);
            const res = await API.get(`/rules?year=${year}&league_id=null`);
            setRulesList(res.rules || []);
        } catch (error) {
            console.error("Error loading rules:", error);
        } finally {
            setRulesLoading(false);
        }
    };

    useEffect(() => {
        fetchStandings(selectedYear);
        fetchRules(selectedYear);
    }, [selectedYear]);

    // Load users for admin modal
    const openAddPointModal = async (preselectedUserId = null) => {
        try {
            if (!Array.isArray(allUsers) || allUsers.length === 0) {
                const users = await API.get('/users/get');
                setAllUsers(Array.isArray(users) ? users : []);
            }
            form.resetFields();
            if (preselectedUserId) {
                form.setFieldsValue({ user_id: preselectedUserId });
            }
            form.setFieldsValue({
                year: selectedYear,
                points: 5,
                position: 1
            });
            setIsFormModalOpen(true);
        } catch (error) {
            console.error("Error opening admin modal:", error);
        }
    };

    // Create point entry
    const handleCreatePoint = async (values) => {
        try {
            setSubmitting(true);
            await API.post('/pachanga/set', {
                user_id: values.user_id,
                competition_name: values.competition_name,
                points: values.points,
                position: values.position || null,
                year: values.year || selectedYear,
                date: new Date().toISOString()
            });

            showAlert('success', 'Puntos añadidos correctamente');
            setIsFormModalOpen(false);
            form.resetFields();
            await fetchStandings(selectedYear);
        } catch (error) {
            console.error("Error saving point entry:", error);
            showAlert('error', error.response?.data?.error || 'Error al añadir los puntos');
        } finally {
            setSubmitting(false);
        }
    };

    // Delete point entry
    const handleDeletePoint = async (pointId, e) => {
        if (e) e.stopPropagation();
        try {
            await API.delete(`/pachanga/delete/${pointId}`);
            showAlert('success', 'Puntos eliminados correctamente');
            await fetchStandings(selectedYear);
        } catch (error) {
            console.error("Error deleting point entry:", error);
            showAlert('error', error.response?.data?.error || 'Error al eliminar');
        }
    };

    // Open Add / Edit Rule Modal
    const openRuleModal = (rule = null) => {
        ruleForm.resetFields();
        if (rule) {
            setEditingRule(rule);
            ruleForm.setFieldsValue({
                title: rule.title || '',
                content: rule.content || '',
                category: rule.category || 'general',
                year: rule.year || selectedYear,
                order_num: rule.order_num || 0
            });
        } else {
            setEditingRule(null);
            ruleForm.setFieldsValue({
                title: `Normativa Oficial Pachanga ${selectedYear}`,
                content: '',
                category: 'general',
                year: selectedYear,
                order_num: (rulesList.length || 0) + 1
            });
        }
        setIsRuleFormModalOpen(true);
    };

    // Save Rule (Create or Update)
    const handleSaveRule = async (values) => {
        try {
            setRuleSubmitting(true);
            const payload = {
                title: values.title || null,
                content: values.content,
                category: values.category || 'general',
                year: values.year ? parseInt(values.year, 10) : selectedYear,
                order_num: values.order_num !== undefined ? parseInt(values.order_num, 10) : 0,
                league_id: null
            };

            if (editingRule) {
                await API.put(`/rules/${editingRule.id}`, payload);
                showAlert('success', 'Normativa actualizada correctamente');
            } else {
                await API.post('/rules', payload);
                showAlert('success', 'Normativa añadida correctamente');
            }

            setIsRuleFormModalOpen(false);
            ruleForm.resetFields();
            await fetchRules(selectedYear);
        } catch (error) {
            console.error("Error saving rule:", error);
            showAlert('error', error.response?.data?.error || 'Error al guardar la normativa');
        } finally {
            setRuleSubmitting(false);
        }
    };

    // Delete Rule
    const handleDeleteRule = async (ruleId, e) => {
        if (e) e.stopPropagation();
        try {
            await API.delete(`/rules/${ruleId}`);
            showAlert('success', 'Normativa eliminada');
            await fetchRules(selectedYear);
        } catch (error) {
            console.error("Error deleting rule:", error);
            showAlert('error', error.response?.data?.error || 'Error al eliminar');
        }
    };

    // Render formatted text content nicely
    const renderFormattedContent = (content) => {
        if (!content) return null;
        const paragraphs = content.split(/\n\s*\n/);

        return (
            <div className="pachanga-rule-content-block">
                {paragraphs.map((para, pIdx) => {
                    const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
                    const isList = lines.every(l => l.startsWith('-') || l.startsWith('•') || /^\d+\./.test(l));

                    if (isList) {
                        return (
                            <ul key={pIdx} className="pachanga-rule-ul">
                                {lines.map((line, lIdx) => (
                                    <li key={lIdx}>{line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '')}</li>
                                ))}
                            </ul>
                        );
                    }

                    return (
                        <p key={pIdx} style={{ marginBottom: 12, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                            {para}
                        </p>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="pachanga-container">
            {/* ─── Header ─── */}
            <div className="pachanga-header">
                <div>
                    <h1 className="pachanga-title">Clasificación Pachanga</h1>
                    <span className="pachanga-sub">Campeonato Oficial de la Temporada</span>
                </div>

                <div className="pachanga-header-actions">
                    <Select
                        value={selectedYear}
                        onChange={(val) => setSelectedYear(val)}
                        style={{ width: 160 }}
                        options={availableYears.map(y => ({
                            value: y,
                            label: `Temporada ${y}`
                        }))}
                    />

                    {isAdmin && (
                        <button
                            className="pachanga-admin-btn"
                            onClick={() => openAddPointModal()}
                        >
                            <PlusOutlined /> Añadir Puntos
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Top Prizes Summary Capsules ─── */}
            <div className="pachanga-prizes-grid">
                <div className="pachanga-prize-card first">
                    <div>
                        <div className="pachanga-prize-label">1.er Puesto — Campeón</div>
                        <div className="pachanga-prize-value">20,00 €</div>
                    </div>
                    <div className="pachanga-prize-tag">1.er Premio</div>
                </div>

                <div className="pachanga-prize-card">
                    <div>
                        <div className="pachanga-prize-label">2.º Puesto — Subcampeón</div>
                        <div className="pachanga-prize-value">10,00 €</div>
                    </div>
                    <div className="pachanga-prize-tag silver">2.º Premio</div>
                </div>

                <div className="pachanga-prize-card">
                    <div>
                        <div className="pachanga-prize-label">3.er Puesto — Tercero</div>
                        <div className="pachanga-prize-value">5,00 €</div>
                    </div>
                    <div className="pachanga-prize-tag bronze">3.er Premio</div>
                </div>
            </div>

            {/* ─── Standings Section ─── */}
            <div className="pachanga-section-heading">
                Clasificación General {selectedYear}
            </div>

            {loading ? (
                <div style={{ marginBottom: 40 }}>
                    <Skeleton active paragraph={{ rows: 6 }} />
                </div>
            ) : standings.length > 0 ? (
                <div className="pachanga-standings-list">
                    {standings.map((player) => {
                        const rankClass = player.rank === 1 ? 'rank-1' : player.rank === 2 ? 'rank-2' : player.rank === 3 ? 'rank-3' : '';

                        return (
                            <div key={player.id} className={`pachanga-player-card ${rankClass}`}>
                                <div className="pachanga-pc-left">
                                    <div className="pachanga-pc-pos">
                                        {player.rank}
                                    </div>
                                    <Avatar
                                        src={getAvatarSrc(player.logo_url)}
                                        icon={<UserOutlined />}
                                        size={44}
                                        className="pachanga-pc-avatar"
                                    />
                                    <div className="pachanga-pc-meta">
                                        <div className="pachanga-pc-name">{player.username}</div>
                                        {player.breakdown && player.breakdown.length > 0 && (
                                            <div className="pachanga-pc-badges">
                                                {player.breakdown.map((item) => (
                                                    <span key={item.id} className="pachanga-pc-chip">
                                                        <span>{item.competition_name} (+{item.points})</span>
                                                        {isAdmin && (
                                                             <Popconfirm
                                                                title="¿Eliminar estos puntos?"
                                                                onConfirm={(e) => handleDeletePoint(item.id, e)}
                                                                okText="Eliminar"
                                                                cancelText="Cancelar"
                                                                okButtonProps={{ danger: true }}
                                                            >
                                                                <button
                                                                    className="pachanga-chip-delete"
                                                                    title="Eliminar este registro"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <CloseOutlined />
                                                                </button>
                                                            </Popconfirm>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pachanga-pc-pts">
                                    <div className="pachanga-pc-pts-num">{player.totalPoints}</div>
                                    <div className="pachanga-pc-pts-sub">Puntos Totales</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', marginBottom: 40 }}>
                    <Empty description={`No hay registros de puntos para la temporada ${selectedYear}.`} />
                </div>
            )}

            {/* ─── Bottom Grid: Rules Summary + Stats Teaser ─── */}
            <div className="pachanga-bottom-grid">
                {/* Rules Summary Card */}
                <div className="pachanga-bottom-card">
                    <div>
                        <h4>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BookOutlined style={{ color: '#60a5fa' }} /> Normativa de la Pachanga {selectedYear}
                            </span>
                            {rulesList.length > 0 && (
                                <span style={{ fontSize: 11, color: '#788296', fontWeight: 600 }}>
                                    {rulesList.length} {rulesList.length === 1 ? 'sección' : 'secciones'}
                                </span>
                            )}
                        </h4>

                        {rulesLoading ? (
                            <Skeleton active paragraph={{ rows: 3 }} />
                        ) : rulesList.length > 0 ? (
                            <div className="pachanga-rules-preview-box">
                                {rulesList.slice(0, 2).map((r) => (
                                    <div key={r.id} style={{ marginBottom: 10 }}>
                                        {r.title && <div className="pachanga-rules-preview-title">{r.title}</div>}
                                        <div className="pachanga-rules-preview-text">
                                            {r.content.length > 180 ? `${r.content.substring(0, 180)}...` : r.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
                                No hay normativa registrada para la temporada {selectedYear}.
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                        <button
                            className="pachanga-read-more-btn"
                            onClick={() => setIsRulesModalOpen(true)}
                        >
                            {rulesList.length > 0 ? `Leer Normativa Completa ${selectedYear}` : 'Ver Normativa'} <ArrowRightOutlined style={{ fontSize: 11 }} />
                        </button>

                        {isAdmin && (
                            <button
                                className="pachanga-admin-btn-secondary"
                                onClick={() => openRuleModal()}
                                title="Añadir nueva regla o texto de normativa"
                            >
                                <PlusOutlined /> Añadir Norma
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Teaser */}
                <div className="pachanga-bottom-card pachanga-stats-card">
                    <div className="pachanga-stats-tag">Próximamente</div>
                    <h4 style={{ color: '#ffffff', margin: '6px 0 2px', justifyContent: 'center' }}>
                        Estadísticas de Jugadores
                    </h4>
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/*          DYNAMIC RULES MODAL               */}
            {/* ═══════════════════════════════════════════ */}
            <Modal
                title={
                    <div style={{ padding: '6px 0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
                        <Title level={4} style={{ margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookOutlined style={{ color: '#60a5fa' }} /> Normativa Oficial — Pachanga {selectedYear}
                        </Title>
                        {isAdmin && (
                            <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => openRuleModal()}
                                style={{ background: '#3b82f6' }}
                            >
                                Añadir Norma
                            </Button>
                        )}
                    </div>
                }
                open={isRulesModalOpen}
                onCancel={() => setIsRulesModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsRulesModalOpen(false)}>
                        Cerrar
                    </Button>
                ]}
                width={800}
                centered
            >
                <div className="pachanga-rules-modal-body">
                    {rulesLoading ? (
                        <Skeleton active paragraph={{ rows: 8 }} />
                    ) : rulesList.length > 0 ? (
                        rulesList.map((rule) => (
                            <div key={rule.id} className="pachanga-rule-card">
                                <div className="pachanga-rule-header">
                                    <h3 className="pachanga-rule-title">
                                        {rule.title || `Normativa ${rule.year}`}
                                    </h3>

                                    {isAdmin && (
                                        <Space size={6}>
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<EditOutlined />}
                                                onClick={() => openRuleModal(rule)}
                                                style={{ color: '#60a5fa' }}
                                                title="Editar esta norma"
                                            >
                                                Editar
                                            </Button>
                                            <Popconfirm
                                                title="¿Eliminar esta normativa?"
                                                description="Esta acción eliminará este registro de la base de datos."
                                                onConfirm={(e) => handleDeleteRule(rule.id, e)}
                                                okText="Eliminar"
                                                cancelText="Cancelar"
                                                okButtonProps={{ danger: true }}
                                            >
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    danger
                                                    title="Eliminar norma"
                                                >
                                                    Eliminar
                                                </Button>
                                            </Popconfirm>
                                        </Space>
                                    )}
                                </div>

                                {renderFormattedContent(rule.content)}
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <Empty description={`No hay normativa registrada en la base de datos para la temporada ${selectedYear}.`} />
                            {isAdmin && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    style={{ marginTop: 16 }}
                                    onClick={() => openRuleModal()}
                                >
                                    Añadir primera norma
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            {/* ═══════════════════════════════════════════ */}
            {/*       ADMIN CREATE / EDIT RULE MODAL       */}
            {/* ═══════════════════════════════════════════ */}
            <Modal
                title={
                    <div style={{ padding: '6px 0 4px' }}>
                        <Title level={4} style={{ margin: 0 }}>
                            {editingRule ? 'Editar Normativa' : 'Añadir Normativa a la Base de Datos'}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {editingRule ? 'Modifica el contenido de la regla' : `Guarda las normas para la temporada ${selectedYear}`}
                        </Text>
                    </div>
                }
                open={isRuleFormModalOpen}
                onCancel={() => setIsRuleFormModalOpen(false)}
                footer={null}
                width={720}
                centered
            >
                <Form
                    form={ruleForm}
                    layout="vertical"
                    onFinish={handleSaveRule}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="title"
                        label="Título de la Sección / Normativa"
                    >
                        <Input placeholder="Ej: Normativa Oficial Pachanga 2026 o 2. Sistema de Puntos por Partidos" />
                    </Form.Item>

                    <Form.Item
                        name="content"
                        label="Contenido Completo de la Normativa"
                        rules={[{ required: true, message: 'Por favor pega o escribe el texto de la normativa' }]}
                        help="Puedes pegar el texto completo con saltos de línea, listas con guiones (-) o números."
                    >
                        <TextArea
                            rows={12}
                            placeholder="Pega aquí el texto completo de las normas..."
                            style={{ fontFamily: 'inherit', fontSize: 14 }}
                        />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item
                            name="year"
                            label="Año / Temporada"
                        >
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            name="order_num"
                            label="Orden de visualización"
                        >
                            <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                        <Button onClick={() => setIsRuleFormModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="primary" htmlType="submit" loading={ruleSubmitting}>
                            {editingRule ? 'Guardar Cambios' : 'Crear Normativa'}
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ═══════════════════════════════════════════ */}
            {/*            ADMIN ADD POINT MODAL            */}
            {/* ═══════════════════════════════════════════ */}
            <Modal
                title={
                    <div style={{ padding: '6px 0 4px' }}>
                        <Title level={4} style={{ margin: 0 }}>Añadir Puntos a la Pachanga</Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Registra puntos manualmente a un jugador para la temporada {selectedYear}
                        </Text>
                    </div>
                }
                open={isFormModalOpen}
                onCancel={() => setIsFormModalOpen(false)}
                footer={null}
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreatePoint}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="user_id"
                        label="Jugador"
                        rules={[{ required: true, message: 'Selecciona un jugador' }]}
                    >
                        <Select
                            placeholder="Selecciona jugador"
                            options={(Array.isArray(allUsers) ? allUsers : []).map(u => ({
                                value: u.id,
                                label: u.username
                            }))}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="competition_name"
                        label="Competición / Evento"
                        rules={[{ required: true, message: 'Indica el nombre de la competición' }]}
                    >
                        <Input placeholder="Ej: LEC Versus 2026" />
                    </Form.Item>

                    <Form.Item
                        name="points"
                        label="Puntos a otorgar"
                        rules={[{ required: true, message: 'Indica los puntos' }]}
                    >
                        <Select
                            options={[
                                { value: 5, label: '5 Puntos (1.er Puesto)' },
                                { value: 3, label: '3 Puntos (2.º Puesto)' },
                                { value: 1, label: '1 Punto (3.er Puesto)' },
                                { value: 2, label: '2 Puntos' },
                                { value: 4, label: '4 Puntos' }
                            ]}
                        />
                    </Form.Item>

                    <Form.Item
                        name="year"
                        label="Año / Temporada"
                    >
                        <Input type="number" />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                        <Button onClick={() => setIsFormModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                            Guardar Puntos
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default PachangaStanding;
