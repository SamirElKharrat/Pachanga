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

                // Get the most recent live league
                const liveLeagues = leagues
                    .filter(l => l.status === 'live')
                    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                let currentLeague = liveLeagues[0];
                console.log(liveLeagues);

                // Fallback to the most recent finished league if no live league exists
                if (!currentLeague) {
                    const finishedLeagues = leagues
                        .filter(l => l.status === 'finished')
                        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                    currentLeague = finishedLeagues[0];
                }

                // Ultimate fallback to the overall most recent league (e.g. scheduled)
                if (!currentLeague) {
                    const sortedLeagues = [...leagues].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                    currentLeague = sortedLeagues[0];
                }

                // 2. Get participants and their points for this league
                const participants = await API.get(`/leagueParticipations/get/participants/${currentLeague.id}`);

                if (!participants || participants.length === 0) {
                    setIsWinning('NO');
                    return;
                }

                // Sort by points descending
                const sorted = [...participants].sort((a, b) => (b.points || 0) - (a.points || 0));

                // Check if the top one is Guille
                if (sorted[0].user_id === GUILLE_ID) {
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
                    color: isWinning === 'SÍ' ? '#52c41a' : '#ff4d4f',
                    lineHeight: 1,
                    textShadow: isWinning === 'SÍ' ? '0 0 60px rgba(82,196,26,0.4)' : '0 0 60px rgba(255,77,79,0.4)'
                }}
            >
                {isWinning}
            </Title>
        </Flex>
    );
};

export default IsGuilleWinning;
