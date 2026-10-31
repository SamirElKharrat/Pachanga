import React, { useEffect, useState } from 'react';
import { Typography, Spin, Empty, Card, Flex } from 'antd';
import { API } from '../../services/api';
import { ThunderboltOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const IsGuilleWinning = () => {
    const [isWinning, setIsWinning] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const GUILLE_ID = 27;

    useEffect(() => {
        const checkGuille = async () => {
            try {
                setLoading(true);
                // 1. Get all leagues to find the current active one
                const leagues = await API.get('/leagues/get');
                if (!leagues || leagues.length === 0) {
                    setIsWinning('NO');
                    return;
                }

                // La liga en curso se elige por fechas y no por `status`: el estado
                // solo se actualiza cuando alguien abre la portada y suele ir con
                // retraso, y entonces se miraba una liga vieja.
                const now = new Date();
                const byNewest = [...leagues].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                const inProgress = byNewest.filter(l => new Date(l.start_date) <= now && now <= new Date(l.end_date));
                const started = byNewest.filter(l => new Date(l.start_date) <= now);
                const currentLeague = inProgress[0]
                    || byNewest.find(l => l.status === 'live')
                    || started[0]
                    || byNewest[0];

                // 2. Get participants and their points for this league
                const participants = await API.get(`/leagueParticipations/get/participants/${currentLeague.id}`);

                if (!participants || participants.length === 0) {
                    setIsWinning('NO');
                    return;
                }

                // Gana si nadie tiene más puntos que él: empatado arriba también cuenta.
                const points = p => Number(p.points) || 0;
                const guille = participants.find(p => Number(p.user_id) === GUILLE_ID);
                const topPoints = Math.max(...participants.map(points));

                if (guille && points(guille) === topPoints) {
                    setIsWinning('SÍ');
                } else {
                    setIsWinning('NO');
                }
            } catch (err) {
                console.error("Error checking if Guille is winning:", err);
                setError("No se pudo calcular la victoria de Guille.");
            } finally {
                setLoading(false);
            }
        };

        checkGuille();
    }, []);

    if (loading) {
        return (
            <Flex vertical align="center" justify="center" gap={16} style={{ height: '70vh' }}>
                <Spin size="large" />
                <Text type="secondary">Calculando el destino de Guille...</Text>
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex align="center" justify="center" style={{ padding: 40 }}>
                <Empty description={error} />
            </Flex>
        );
    }
    return (
        <Flex vertical align="center" justify="center" style={{ height: '80vh', padding: 24, textAlign: 'center' }}>
            <Title
                style={{
                    fontSize: 'clamp(80px, 15vw, 180px)',
                    margin: 0,
                    color: isWinning === 'SÍ' ? 'var(--success-vivid)' : 'var(--danger-vivid)',
                    lineHeight: 1,
                    textShadow: isWinning === 'SÍ' ? '0 0 60px rgba(var(--success-vivid-rgb),0.4)' : '0 0 60px rgba(var(--danger-vivid-rgb),0.4)'
                }}
            >
                {isWinning}
            </Title>
        </Flex>
    );
};

export default IsGuilleWinning;
