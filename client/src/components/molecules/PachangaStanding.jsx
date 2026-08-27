import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Avatar, Skeleton, Modal, Form, Input, Select, Button, Popconfirm, Empty, Space } from 'antd';
import { UserOutlined, PlusOutlined, CloseOutlined, ArrowRightOutlined, BookOutlined, BarChartOutlined } from '@ant-design/icons';
import { API } from '../../services/api';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import { showAlert } from '../atoms/AlertInfo';
import StatsSummaryCard from '../atoms/StatsSummaryCard';
import './css/PachangaStanding.css';

const { Title, Text } = Typography;

const PachangaStanding = () => {
    const [standings, setStandings] = useState([]);
    const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // Modals
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [form] = Form.useForm();
    const nav = useNavigate();
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

    useEffect(() => {
        fetchStandings(selectedYear);
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
                            <span>Normativa de la Pachanga {selectedYear}</span>
                            <span style={{ fontSize: 11, color: '#788296', fontWeight: 600 }}>6 Competiciones</span>
                        </h4>
                        <ul className="pachanga-rules-summary-list">
                            <li><strong>Puntuación Pachanga:</strong> 1.º (5 pts) • 2.º (3 pts) • 3.º (1 pt) en cada liga oficial.</li>
                            <li><strong>Partidos:</strong> BO1 (2 pts) • BO3 (2 vict / 3 result) • BO5 (2 vict / 5 result).</li>
                            <li><strong>Premios Temporada:</strong> 1.º (20 €) • 2.º (10 €) • 3.º (5 €) para LoL u otro juego.</li>
                            <li><strong>Excepción:</strong> Worlds no suma puntos para la Pachanga y cuenta con premios propios independientes.</li>
                        </ul>
                    </div>
                    <button
                        className="pachanga-read-more-btn"
                        onClick={() => setIsRulesModalOpen(true)}
                    >
                        Leer Normativa Completa {selectedYear} <ArrowRightOutlined style={{ fontSize: 11 }} />
                    </button>
                </div>

            </div>

            {/* ─── Estadísticas de la temporada ─── */}
            <div style={{ marginTop: 20 }}>
                <StatsSummaryCard
                    variant="pachanga"
                    year={selectedYear}
                    onSeeMore={() => nav(`/estadisticas?year=${selectedYear}`)}
                />
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/*          FULL RULES MODAL (2026)           */}
            {/* ═══════════════════════════════════════════ */}
            <Modal
                title={
                    <div style={{ padding: '6px 0 4px' }}>
                        <Title level={4} style={{ margin: 0, color: '#f8fafc' }}>
                            Normativa Oficial — Pachanga {selectedYear}
                        </Title>
                    </div>
                }
                open={isRulesModalOpen}
                onCancel={() => setIsRulesModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsRulesModalOpen(false)}>
                        Cerrar
                    </Button>
                ]}
                width={740}
                centered
            >
                <div className="pachanga-rules-modal-body">
                    <p>Hola, bienvenidos a la <strong>Pachanga 2026</strong>.</p>

                    <h3>1. Competiciones de la Temporada</h3>
                    <p>Este año tendremos <strong>6 competiciones en total</strong>:</p>
                    <ul>
                        <li>LEC Versus (LEC)</li>
                        <li>Last Stand (Internacional)</li>
                        <li>Spring Split (LEC)</li>
                        <li>MSI (Internacional)</li>
                        <li>Summer Split (LEC)</li>
                        <li>Worlds (Internacional) <em>(FabriFraude)</em></li>
                    </ul>
                    <p style={{ fontSize: 13, color: '#788296' }}>Este año va a ser básicamente como el anterior en casi todo.</p>

                    <h3>2. Sistema de Puntos por Partidos</h3>
                    <ul>
                        <li><strong>Los BO1</strong> dan 2 puntos por acierto.</li>
                        <li><strong>Los BO3</strong> dan 2 puntos por victoria y 3 por resultado.</li>
                        <li><strong>Los BO5</strong> dan 2 puntos por victoria y 5 por resultado.</li>
                    </ul>

                    <h3>3. Sistema de Plenos Semanales</h3>
                    <p>Los plenos van a cambiar este año, ya que con la web a veces una semana hay 2 partidos, o 5 o más. Ahora funcionará así:</p>
                    <ul>
                        <li>Los plenos serán cuando se acierten mínimo más de 1 partido.</li>
                        <li>Como la web funciona semanal, para hacerte un pleno completo tendrás que adivinar todos los partidos de esa semana.</li>
                        <li>Adivinar <strong>3 partidos seguidos:</strong> dará 1 punto.</li>
                        <li>Adivinar <strong>5 partidos seguidos:</strong> dará 2 puntos.</li>
                        <li>Adivinar <strong>más de 5 partidos seguidos:</strong> dará 3 puntos.</li>
                    </ul>

                    <h3>4. Equipos Favoritos</h3>
                    <p>Seguiremos con los equipos favoritos, dando <strong>+1 punto</strong> por acertar su resultado y su victoria. También tendremos los puntos finales según dónde terminó tu equipo:</p>
                    <ul>
                        <li>1.º: 20 puntos • 2.º: 16 puntos</li>
                        <li>3.º: 12 puntos • 4.º: 10 puntos</li>
                        <li>5.º: 8 puntos • 6.º: 6 puntos</li>
                        <li>7.º: 5 puntos • 8.º: 3 puntos</li>
                    </ul>

                    <h3>5. Clasificación y Premios de la Pachanga</h3>
                    <p>Por cada competición, el top 3 se apuntará puntos que se usarán al final para declarar el top 3 de los mejores de la Pachanga:</p>
                    <ul>
                        <li>🥇 <strong>1.º:</strong> 5 puntos</li>
                        <li>🥈 <strong>2.º:</strong> 3 puntos</li>
                        <li>🥉 <strong>3.º:</strong> 1 punto</li>
                    </ul>
                    <div className="pachanga-notice-box">
                        <strong>Premios de la Pachanga (pueden cambiar):</strong><br />
                        • <strong>1.º:</strong> 20 € para el LoL u otro juego<br />
                        • <strong>2.º:</strong> 10 € para el LoL u otro juego<br />
                        • <strong>3.º:</strong> 5 € para el LoL u otro juego
                    </div>

                    <h3>6. Premios Especiales de Worlds</h3>
                    <p>El Mundial tiene premios propios independientes, como los del año pasado:</p>
                    <ul>
                        <li><strong>Premio Base:</strong> 10 € en RP o en otro juego.</li>
                        <li>Si el ganador del Mundial es tu equipo y tú has ganado la competición: la skin vendrá con su edición superior (con el chroma y todo lo demás).</li>
                        <li>Si el ganador del Mundial es un equipo europeo, es tu equipo favorito y tú has ganado la competición: te llevarás la camiseta del equipo (puede ser la del siguiente año o la de Worlds).</li>
                        <li>Los 10 € son el premio base; si se cumplen las dos condiciones, se cambian por el premio monetario, y si no quieres ni la skin ni la camiseta, pues RP con el valor.</li>
                    </ul>

                    <div className="pachanga-notice-box" style={{ marginTop: 24 }}>
                        💡 <em>Recordad, como siempre: si tenéis ideas o errores que habéis visto, comentádmelo :)</em>
                    </div>
                </div>
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
