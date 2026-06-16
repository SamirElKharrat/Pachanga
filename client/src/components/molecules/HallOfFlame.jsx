import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Avatar, Divider, Space, Skeleton, Badge, Modal, Statistic, List, theme, Flex } from 'antd';
import { TrophyOutlined, UserOutlined, GlobalOutlined, LineChartOutlined, FireOutlined, ThunderboltOutlined, CrownOutlined } from '@ant-design/icons';
import { API } from '../../services/api';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const { Title, Text, Paragraph } = Typography;

const WINNERS_DATA = [
    {
        username: 'Guille',
        wins: 11,
        leagues: 'LEC WINTER 2023, WORLDS 2023, LEC WINTER 2024, LEC SPRING REGULAR 2024, LEC SPRING 2024, LEC FINALS 2024, PACHANGA 24, LEC WINTER 2025, FIRST STAND 2025, LEC SUMMER 2025, PACHANGA 2025'
    },
    {
        username: 'Fabri',
        wins: 3,
        leagues: 'WORLDS 2022 (EMPATE), WORLDS 2024, WORLDS 2025'
    },
    {
        username: 'Samir',
        wins: 3,
        leagues: 'LEC SPRING 2023, LEC SUMMER 2023, LEC VERSUS 2026'
    },
    {
        username: 'Aridane',
        wins: 2,
        leagues: 'MSI 2024, LEC SUMMER REGULAR 2024'
    },
    {
        username: 'Tensi',
        wins: 2,
        leagues: 'WORLDS 2022 (EMPATE), LEC SUMMER 2024'
    },
    {
        username: 'Karim',
        wins: 3,
        leagues: 'MSI 2023, MSI 2025, FIRST STAND 2026'
    },
    {
        username: 'Javi',
        wins: 1,
        leagues: 'LEC SPRING 2025'
    }
];

const HallOfFlame = () => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { token } = theme.useToken();
    const { getAvatarSrc } = useAppTheme();

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                setLoading(true);
                const users = await API.get('/users/get');

                const sortedUsers = users.map(u => {
                    const winInfo = WINNERS_DATA.find(w => w.username.toLowerCase() === u.username.toLowerCase());
                    return { ...u, winInfo };
                }).sort((a, b) => (b.winInfo?.wins || 0) - (a.winInfo?.wins || 0));

                setPlayers(sortedUsers);
            } catch (error) {
                console.error("Error loading players for Hall of Flame:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlayers();
    }, []);

    const openDetails = (player) => {
        setSelectedPlayer(player);
        setIsModalOpen(true);
    };

    return (
        <Flex vertical style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
            <Flex vertical align="center" style={{ marginBottom: 48 }}>
                <TrophyOutlined style={{ fontSize: 40, color: '#fadb14', marginBottom: 12 }} />
                <Title level={1} style={{ margin: 0 }}>Hall of Flame</Title>
                <Paragraph type="secondary" style={{ fontSize: 14, marginTop: 8 }}>
                    Reconocimiento a los jugadores de la Pachanga.
                </Paragraph>
            </Flex>

            <Row gutter={[32, 24]}>
                {/* Lado izquierdo: Clasificación Pachanga */}
                <Col xs={24} md={9} lg={8}>
                    <Flex vertical style={{ minHeight: 70, marginTop: 5 }}>
                        <Space style={{ marginBottom: 4 }}>
                            <Title level={3} style={{ margin: 0 }}>Pachanga 202X</Title>
                            <TrophyOutlined style={{ color: '#fadb14', fontSize: 20 }} />
                        </Space>
                        <Text type="secondary" style={{ fontSize: 13 }}>Puntos acumulados en la temporada actual</Text>
                    </Flex>

                    <Skeleton loading={loading} active paragraph={{ rows: 10 }}>
                        <Flex vertical gap={12}>
                            {players.map((player, index) => (
                                <Flex
                                    key={`rank-${player.id}`}
                                    align="center"
                                    gap={12}
                                    style={{
                                        padding: '12px 16px',
                                        background: token.colorFillTertiary,
                                        borderRadius: 8,
                                        border: `1px solid ${token.colorBorder}`
                                    }}
                                >
                                    <Text strong style={{ fontSize: 14, width: 24, textAlign: 'center', opacity: 0.3 }}>#{index + 1}</Text>
                                    <Avatar src={getAvatarSrc(player.logo_url)} icon={<UserOutlined />} size={32} />
                                    <Text strong style={{ fontSize: 14 }}>{player.username}</Text>
                                    <Flex style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                        <Text strong style={{ fontSize: 16, color: '#3b82f6' }}>0</Text>
                                        <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 4 }}>PTS</span>
                                    </Flex>
                                </Flex>
                            ))}
                        </Flex>
                    </Skeleton>
                </Col>

                {/* Lado derecho: Ganadores */}
                <Col xs={24} md={15} lg={16}>
                    <Flex vertical style={{ marginBottom: 24, minHeight: 70 }}>
                        <Space style={{ marginBottom: 4 }}>
                            <Title level={3} style={{ margin: 0 }}>Campeones</Title>
                            <CrownOutlined style={{ color: '#fadb14', fontSize: 20 }} />
                        </Space>
                        <Text type="secondary" style={{ fontSize: 13 }}>Jugadores y ligas que han ganado</Text>
                    </Flex>

                    <Skeleton loading={loading} active paragraph={{ rows: 10 }}>
                        <Row gutter={[16, 16]}>
                            {players.map((player) => (
                                <Col key={`winner-${player.id}`} xs={24} sm={12} md={12} lg={12} xl={8}>
                                    <Card
                                        hoverable
                                        className="shadow-sm border-0"
                                        onClick={() => openDetails(player)}
                                        style={{
                                            borderRadius: 12,
                                            background: token.colorFillTertiary,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                        styles={{ body: { padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' } }}
                                    >
                                        <Flex vertical align="center" style={{ marginBottom: 12 }}>
                                            <Badge count={player.winInfo?.wins || 0} color="#fadb14" offset={[-5, 45]}>
                                                <Avatar
                                                    src={getAvatarSrc(player.logo_url)}
                                                    icon={<UserOutlined />}
                                                    size={60}
                                                    style={{ border: player.winInfo?.wins > 10 ? '2px solid #fadb14' : `2px solid ${token.colorBorder}` }}
                                                />
                                                {player.winInfo?.wins > 10 && (
                                                    <CrownOutlined style={{
                                                        position: 'absolute',
                                                        top: -15,
                                                        left: '50%',
                                                        transform: 'translateX(-50%) rotate(-10deg)',
                                                        fontSize: 24,
                                                        color: '#fadb14',
                                                        filter: 'drop-shadow(0 0 5px rgba(250, 219, 20, 0.5))'
                                                    }} />
                                                )}
                                            </Badge>
                                            <Title level={5} style={{ margin: '12px 0 2px 0' }}>{player.username}</Title>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {player.winInfo?.wins || 0} {player.winInfo?.wins === 1 ? 'Victoria' : 'Victorias'}
                                            </Text>
                                        </Flex>

                                        <Divider style={{ margin: '8px 0' }} />

                                        <Flex vertical align="center" style={{ flex: 1, textAlign: 'center' }}>
                                            <Flex align="center" justify="center" gap={4} style={{ marginBottom: 4 }}>
                                                <GlobalOutlined style={{ fontSize: 10, opacity: 0.5 }} />
                                                <Text strong style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.5 }}>Ligas Ganadas</Text>
                                            </Flex>
                                            <Paragraph
                                                type="secondary"
                                                style={{
                                                    fontSize: 11,
                                                    lineHeight: '1.4',
                                                    margin: 0,
                                                    height: player.winInfo?.leagues ? 'auto' : 40
                                                }}
                                                ellipsis={{ rows: 3, expandable: false }}
                                            >
                                                {player.winInfo?.leagues || 'Próximamente...'}
                                            </Paragraph>
                                        </Flex>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </Skeleton>
                </Col>
            </Row>

            <Modal
                title={null}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                centered
                width={600}
                styles={{ content: { background: token.colorBgContainer, border: `1px solid ${token.colorBorder}`, borderRadius: 24, padding: 0, overflow: 'hidden' } }}
            >
                {selectedPlayer && (
                    <Flex vertical style={{ padding: 0 }}>
                        <Flex vertical align="center" style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(245, 34, 45, 0.1) 100%)',
                            padding: '40px 24px',
                            position: 'relative'
                        }}>
                            {selectedPlayer.winInfo?.wins > 10 && (
                                <CrownOutlined style={{
                                    position: 'absolute',
                                    top: 15,
                                    left: '50%',
                                    transform: 'translateX(-50%) rotate(-10deg)',
                                    fontSize: 32,
                                    color: '#fadb14',
                                    filter: 'drop-shadow(0 0 10px rgba(250, 219, 20, 0.8))'
                                }} />
                            )}
                            <Avatar src={getAvatarSrc(selectedPlayer.logo_url)} size={100} icon={<UserOutlined />} style={{ border: selectedPlayer.winInfo?.wins > 10 ? '4px solid #fadb14' : '4px solid rgba(255,255,255,0.2)', marginBottom: 16 }} />
                            <Title level={2} style={{ margin: 0, color: '#fff' }}>{selectedPlayer.username}</Title>
                            <Text style={{ color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 2, fontSize: 12 }}>Leyenda de la Pachanga</Text>
                        </Flex>

                        <Flex vertical style={{ padding: 24 }}>
                            <Row gutter={16} style={{ marginBottom: 32 }}>
                                <Col span={8}>
                                    <Card style={{ background: token.colorFillTertiary, border: 'none', borderRadius: 16 }}>
                                        <Statistic
                                            title={<Text type="secondary" style={{ fontSize: 10 }}>WINS</Text>}
                                            value={selectedPlayer.winInfo?.wins || 0}
                                            prefix={<FireOutlined style={{ color: '#fadb14' }} />}
                                            valueStyle={{ fontSize: 24 }}
                                        />
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card style={{ background: token.colorFillTertiary, border: 'none', borderRadius: 16 }}>
                                        <Statistic
                                            title={<Text type="secondary" style={{ fontSize: 10 }}>WIN RATE</Text>}
                                            value={selectedPlayer.winInfo ? ((selectedPlayer.winInfo.wins / 23) * 100).toFixed(1) : "0.0"}
                                            suffix="%"
                                            prefix={<LineChartOutlined style={{ color: '#52c41a' }} />}
                                            valueStyle={{ fontSize: 24 }}
                                        />
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card style={{ background: token.colorFillTertiary, border: 'none', borderRadius: 16 }}>
                                        <Statistic
                                            title={<Text type="secondary" style={{ fontSize: 10 }}>RANK</Text>}
                                            value={selectedPlayer.id === 27 ? 'S+' : 'A'}
                                            prefix={<ThunderboltOutlined style={{ color: '#3b82f6' }} />}
                                            valueStyle={{ fontSize: 24 }}
                                        />
                                    </Card>
                                </Col>
                            </Row>

                            <Title level={5} style={{ marginBottom: 16 }}>
                                <GlobalOutlined style={{ marginRight: 8, opacity: 0.5 }} />
                                Historial de Conquistas
                            </Title>

                            <List
                                dataSource={selectedPlayer.winInfo?.leagues.split(', ') || []}
                                renderItem={(item) => (
                                    <List.Item style={{ borderBottom: `1px solid ${token.colorBorder}`, padding: '12px 0' }}>
                                        <Space>
                                            <TrophyOutlined style={{ color: '#fadb14', fontSize: 16 }} />
                                            <Text>{item}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                                locale={{ emptyText: <Text type="secondary">Iniciando su legado...</Text> }}
                                style={{ maxHeight: 250, overflowY: 'auto' }}
                            />
                        </Flex>
                    </Flex>
                )}
            </Modal>
        </Flex>
    );
};

export default HallOfFlame;
