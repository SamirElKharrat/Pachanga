import React, { useEffect, useState } from 'react';
import { Typography, Spin, Empty, Card } from 'antd';
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

                // Sort leagues by start_date descending to get the most recent one
                const sortedLeagues = [...leagues].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                const currentLeague = sortedLeagues[0];
                console.log('League checked:', currentLeague?.name);

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
            <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <Spin size="large" />
                <Text type="secondary">Calculando el destino de Guille...</Text>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description={error} />
            </div>
        );
    }
    return (
        <div style={{
            height: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: 24,
            textAlign: 'center'
        }}>
            <Text style={{
                textTransform: 'uppercase',
                letterSpacing: 4,
                opacity: 0.5,
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 16
            }}>
                ¿Está ganando Guille?
            </Text>

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

            <div style={{ marginTop: 40 }}>
                <Text type="secondary" style={{
                    fontSize: 18,
                    fontWeight: 500
                }}>
                    {isWinning === 'SÍ'
                        ? "El orden natural de las cosas se mantiene."
                        : "Algo no va bien en la simulación."}
                </Text>
            </div>
        </div>
    );
};

export default IsGuilleWinning;
