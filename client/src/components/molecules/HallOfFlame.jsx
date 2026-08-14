import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Avatar, Skeleton, Modal, Form, Input, Select, DatePicker, Button, Popconfirm, theme } from 'antd';
import { UserOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { API } from '../../services/api';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import { showAlert } from '../atoms/AlertInfo';
import dayjs from 'dayjs';
import './css/HallOfFlame.css';

const { Title, Text } = Typography;

const getSubtitle = (wins) => {
    if (wins >= 10) return 'Leyenda de la Pachanga';
    if (wins >= 5) return 'Veterano de la Pachanga';
    if (wins >= 3) return 'Competidor Destacado';
    if (wins >= 2) return 'Campeón';
    return 'Primer Trofeo';
};

const HallOfFlame = () => {
    const [players, setPlayers] = useState([]);
    const [totalCompetitions, setTotalCompetitions] = useState(1);
    const [allUsers, setAllUsers] = useState([]);
    const [allLeagues, setAllLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { token } = theme.useToken();
    const { getAvatarSrc } = useAppTheme();

    const fetchHallData = async () => {
        try {
            setLoading(true);
            const response = await API.get('/hall/get');
            if (response && response.players) {
                setPlayers(response.players);
                setTotalCompetitions(response.totalCompetitions || 1);
            }
        } catch (error) {
            console.error("Error loading Hall of Flame data:", error);
            showAlert('error', 'Error al cargar el Hall of Flame');
        } finally {
            setLoading(false);
        }
    };

    const fetchFormData = async () => {
        try {
            const [usersData, leaguesData] = await Promise.all([
                API.get('/users/get').catch(() => []),
                API.get('/leagues/get').catch(() => [])
            ]);
            setAllUsers(usersData || []);
            setAllLeagues(leaguesData || []);
        } catch (error) {
            console.error("Error fetching auxiliary data for form:", error);
        }
    };

    useEffect(() => {
        fetchHallData();
        fetchFormData();

        // Check if current user is admin
        const checkAdmin = async () => {
            try {
                const storedAdmin = localStorage.getItem('admin') === 'true';
                if (storedAdmin) {
                    setIsAdmin(true);
                    return;
                }
                const user = await API.getUserByToken();
                if (user && user.role === 'admin') {
                    setIsAdmin(true);
                }
            } catch {
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, []);

    const openPlayerDetails = (player) => {
        setSelectedPlayer(player);
        setIsPlayerModalOpen(true);
    };

    const openAddTrophyModal = (preselectedUserId = null) => {
        form.resetFields();
        if (preselectedUserId) {
            form.setFieldsValue({ user_id: preselectedUserId });
        }
        setIsFormModalOpen(true);
    };

    const handleCreateTrophy = async (values) => {
        try {
            setSubmitting(true);
            const payload = {
                user_id: values.user_id,
                competition_name: values.competition_name,
                league_id: values.league_id || null,
                date: values.date ? values.date.toISOString() : new Date().toISOString()
            };

            await API.post('/hall/set', payload);
            showAlert('success', 'Trofeo añadido correctamente');
            setIsFormModalOpen(false);
            form.resetFields();

            // Refresh Hall of Flame
            await fetchHallData();
        } catch (error) {
            console.error("Error creating trophy:", error);
            showAlert('error', error.response?.data?.error || 'Error al añadir el trofeo');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTrophy = async (trophyId, e) => {
        if (e) e.stopPropagation();
        try {
            await API.delete(`/hall/delete/${trophyId}`);
            showAlert('success', 'Trofeo eliminado correctamente');

            // Update selectedPlayer state locally so modal reflects removal immediately
            setSelectedPlayer(prev => {
                if (!prev) return null;
                const updatedTrophies = prev.trophies.filter(t => t.id !== trophyId);
                const newWins = updatedTrophies.length;
                const newWinRate = Number(((newWins / totalCompetitions) * 100).toFixed(1));
                return {
                    ...prev,
                    wins: newWins,
                    trophies: updatedTrophies,
                    winRate: newWinRate
                };
            });

            // Refetch full data in background
            await fetchHallData();
        } catch (error) {
            console.error("Error deleting trophy:", error);
            showAlert('error', error.response?.data?.error || 'Error al eliminar el trofeo');
        }
    };

    const first = players[0];
    const second = players[1];
    const third = players[2];
    const restPlayers = players.slice(3);

    return (
        <div className="hof-container">
            {/* ═══════════════════════════════════════════ */}
            {/*                   HEADER                    */}
            {/* ═══════════════════════════════════════════ */}
            <div className="hof-header">
                {isAdmin && (
                    <button
                        className="hof-header-admin-btn"
                        onClick={() => openAddTrophyModal()}
                    >
                        <PlusOutlined /> Añadir Trofeo
                    </button>
                )}
                <h1>
                    <span>Hall of </span>
                    <span className="hof-flame">Flame</span>
                </h1>
                <p>Palmarés de Campeones</p>
            </div>

            {loading ? (
                <Skeleton active paragraph={{ rows: 12 }} />
            ) : (
                <>
                    {/* ═══════════════════════════════════════════ */}
                    {/*               PODIUM TOP 3                  */}
                    {/* ═══════════════════════════════════════════ */}
                    {players.length > 0 && (
                        <div className="hof-podium-section">
                            <div className="hof-podium">
                                {/* 2nd Place */}
                                {second && (
                                    <div
                                        className="hof-podium-slot second"
                                        onClick={() => openPlayerDetails(second)}
                                    >
                                        <div className="hof-avatar-wrap">
                                            <div className="hof-avatar">
                                                <Avatar
                                                    src={getAvatarSrc(second.logo_url)}
                                                    icon={<UserOutlined />}
                                                    size={76}
                                                />
                                            </div>
                                        </div>
                                        <div className="hof-podium-name">{second.username}</div>
                                        <div className="hof-podium-wins">
                                            <span>{second.wins}</span> {second.wins === 1 ? 'victoria' : 'victorias'}
                                        </div>
                                        <div className="hof-podium-pedestal">2</div>
                                    </div>
                                )}

                                {/* 1st Place */}
                                {first && (
                                    <div
                                        className="hof-podium-slot first"
                                        onClick={() => openPlayerDetails(first)}
                                    >
                                        <div className="hof-avatar-wrap">
                                            <span className="hof-crown">👑</span>
                                            <div className="hof-avatar">
                                                <Avatar
                                                    src={getAvatarSrc(first.logo_url)}
                                                    icon={<UserOutlined />}
                                                    size={104}
                                                />
                                            </div>
                                        </div>
                                        <div className="hof-podium-name">{first.username}</div>
                                        <div className="hof-podium-wins">
                                            <span>{first.wins}</span> {first.wins === 1 ? 'victoria' : 'victorias'}
                                        </div>
                                        <div className="hof-podium-pedestal">1</div>
                                    </div>
                                )}

                                {/* 3rd Place */}
                                {third && (
                                    <div
                                        className="hof-podium-slot third"
                                        onClick={() => openPlayerDetails(third)}
                                    >
                                        <div className="hof-avatar-wrap">
                                            <div className="hof-avatar">
                                                <Avatar
                                                    src={getAvatarSrc(third.logo_url)}
                                                    icon={<UserOutlined />}
                                                    size={76}
                                                />
                                            </div>
                                        </div>
                                        <div className="hof-podium-name">{third.username}</div>
                                        <div className="hof-podium-wins">
                                            <span>{third.wins}</span> {third.wins === 1 ? 'victoria' : 'victorias'}
                                        </div>
                                        <div className="hof-podium-pedestal">3</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════ */}
                    {/*             REST OF PALMARÉS                */}
                    {/* ═══════════════════════════════════════════ */}
                    {restPlayers.length > 0 && (
                        <div>
                            <div className="hof-rest-title">Resto del Palmarés</div>
                            <div className="hof-rest-list">
                                {restPlayers.map((player, index) => {
                                    const rankNumber = index + 4;
                                    const leaguesSummary = player.trophies
                                        ?.map(t => t.competition_name)
                                        .join(', ') || '';

                                    return (
                                        <div
                                            key={player.id}
                                            className="hof-rest-item"
                                            onClick={() => openPlayerDetails(player)}
                                        >
                                            <div className="hof-rest-rank">{rankNumber}</div>
                                            <div className="hof-rest-avatar">
                                                <Avatar
                                                    src={getAvatarSrc(player.logo_url)}
                                                    icon={<UserOutlined />}
                                                    size={44}
                                                />
                                            </div>
                                            <div className="hof-rest-info">
                                                <div className="hof-rest-name">{player.username}</div>
                                                <div className="hof-rest-leagues">{leaguesSummary}</div>
                                            </div>
                                            <div className="hof-rest-wins-badge">
                                                {player.wins} {player.wins === 1 ? 'victoria' : 'victorias'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/*           PLAYER DETAIL MODAL              */}
            {/* ═══════════════════════════════════════════ */}
            <Modal
                open={isPlayerModalOpen}
                onCancel={() => setIsPlayerModalOpen(false)}
                footer={null}
                centered
                width={540}
                style={{ maxWidth: 'calc(100vw - 24px)', margin: '0 auto' }}
                styles={{
                    content: {
                        background: token.colorBgContainer || '#11131a',
                        border: `1px solid ${token.colorBorder || 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 24,
                        padding: 0,
                        overflow: 'hidden'
                    }
                }}
            >
                {selectedPlayer && (
                    <div>
                        <div className="hof-modal-header-player">
                            {(selectedPlayer === first || selectedPlayer.wins >= 10) && (
                                <span className="hof-modal-crown">👑</span>
                            )}
                            <div className="hof-modal-avatar">
                                <Avatar
                                    src={getAvatarSrc(selectedPlayer.logo_url)}
                                    icon={<UserOutlined />}
                                    size={96}
                                />
                            </div>
                            <h2 className="hof-modal-player-name">{selectedPlayer.username}</h2>
                            <div className="hof-modal-player-subtitle">
                                {getSubtitle(selectedPlayer.wins)}
                            </div>
                        </div>

                        <div className="hof-modal-stats">
                            <div className="hof-stat-box">
                                <div className="hof-stat-value">{selectedPlayer.wins}</div>
                                <div className="hof-stat-label">Victorias</div>
                            </div>
                            <div className="hof-stat-box">
                                <div className="hof-stat-value">{selectedPlayer.winRate}%</div>
                                <div className="hof-stat-label">Win Rate</div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="hof-modal-add-trophy">
                                <button
                                    className="hof-modal-add-trophy-btn"
                                    onClick={() => {
                                        const uid = selectedPlayer.id;
                                        setIsPlayerModalOpen(false);
                                        openAddTrophyModal(uid);
                                    }}
                                >
                                    <PlusOutlined /> Añadir Trofeo a este jugador
                                </button>
                            </div>
                        )}

                        <div className="hof-modal-conquests">
                            <div className="hof-conquest-title">Historial de Conquistas</div>
                            {selectedPlayer.trophies && selectedPlayer.trophies.length > 0 ? (
                                selectedPlayer.trophies.map((trophy) => {
                                    const hasLeague = Boolean(trophy.league_id);
                                    return (
                                        <div key={trophy.id} className="hof-conquest-item">
                                            <div className="hof-conquest-dot" />
                                            <span className="hof-conquest-name">
                                                {hasLeague ? (
                                                    <span
                                                        className="hof-conquest-link"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsPlayerModalOpen(false);
                                                            navigate(`/leagues/${trophy.league_id}`);
                                                        }}
                                                    >
                                                        {trophy.competition_name}
                                                    </span>
                                                ) : (
                                                    <span className="hof-conquest-nolink">
                                                        {trophy.competition_name}
                                                    </span>
                                                )}
                                            </span>
                                            {hasLeague && <span className="hof-conquest-arrow">→</span>}
                                            {isAdmin && (
                                                <Popconfirm
                                                    title="¿Eliminar trofeo?"
                                                    description="¿Seguro que quieres eliminar esta victoria del palmarés?"
                                                    onConfirm={(e) => handleDeleteTrophy(trophy.id, e)}
                                                    okText="Eliminar"
                                                    cancelText="Cancelar"
                                                    okButtonProps={{ danger: true }}
                                                >
                                                    <button
                                                        className="hof-conquest-delete-btn"
                                                        title="Eliminar este trofeo"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <CloseOutlined />
                                                    </button>
                                                </Popconfirm>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <Text type="secondary">Sin victorias registradas aún.</Text>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ═══════════════════════════════════════════ */}
            {/*            ADMIN FORM MODAL                */}
            {/* ═══════════════════════════════════════════ */}
            <Modal
                title={
                    <div style={{ padding: '8px 0 4px' }}>
                        <Title level={4} style={{ margin: 0 }}>Añadir Trofeo</Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Registra una victoria manualmente al palmarés de un jugador
                        </Text>
                    </div>
                }
                open={isFormModalOpen}
                onCancel={() => setIsFormModalOpen(false)}
                footer={null}
                centered
                width={520}
                style={{ maxWidth: 'calc(100vw - 24px)', margin: '0 auto' }}
                styles={{
                    content: {
                        background: token.colorBgContainer || '#11131a',
                        border: `1px solid ${token.colorBorder || 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 20
                    }
                }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateTrophy}
                    initialValues={{ date: dayjs() }}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="user_id"
                        label="Jugador"
                        rules={[{ required: true, message: 'Selecciona un jugador' }]}
                    >
                        <Select
                            placeholder="Selecciona un jugador..."
                            options={allUsers.map(u => ({
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
                        label="Nombre de la Competición"
                        rules={[{ required: true, message: 'Introduce el nombre de la competición' }]}
                    >
                        <Input placeholder="Ej: LEC WINTER 2025" />
                    </Form.Item>

                    <Form.Item
                        name="date"
                        label="Fecha"
                    >
                        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>

                    <Form.Item
                        name="league_id"
                        label="Vincular a liga existente (opcional)"
                    >
                        <Select
                            placeholder="No vincular a ninguna liga"
                            allowClear
                            options={allLeagues.map(l => ({
                                value: l.id,
                                label: l.name
                            }))}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                        <Button onClick={() => setIsFormModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={submitting}
                            style={{
                                background: 'linear-gradient(135deg, #d4a843 0%, #8b7030 100%)',
                                borderColor: '#d4a843',
                                color: '#07080d',
                                fontWeight: 700
                            }}
                        >
                            Añadir Trofeo
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default HallOfFlame;
