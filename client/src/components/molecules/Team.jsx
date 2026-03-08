import React, { useEffect, useState } from 'react'
import { API } from '../../services/api';
import { Card, Row, Col, Image, Select, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function Team() {
    const [teams, setTeams] = useState([]);
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { Title, Text } = Typography;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                //Todas las ligas en las que el usuario esta unido
                const response = await API.get('/leagueParticipations/get/')
                const leaguePromises = response.map(participation =>
                    API.get('/leagues/get/' + participation.league_id)
                )
                const leagueArray = await Promise.all(leaguePromises)

                setLeagues(leagueArray);

                if (leagueArray.length > 0) {
                    if (selectedLeague === null) {
                        setSelectedLeague(leagueArray[0].id);
                    } else {
                        const currentLeague = leagueArray.find(league => league.id == selectedLeague);
                        if (currentLeague) {
                            setTeams(currentLeague.Teams || []);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData()
    }, [selectedLeague]);

    if (leagues.length === 0 && !loading) {
        return (
            <div style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center'
            }}>
                <Title level={3} className='noContent'>No estás unido a ninguna liga</Title>
                <Text className='noContent' style={{ marginTop: '16px', fontSize: '16px' }}>
                    Únete a una liga existente para ver los equipos.
                </Text>
                <Button type="primary" onClick={() => navigate('/leagues/')} style={{ marginTop: '16px' }}>
                    Ver Ligas
                </Button>
            </div>
        );
    }

    return (
        <div className='container mt-5'>
            <Row justify='center' align='middle' gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8} lg={6} className='mb-2'>
                    <p style={{ fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center' }}>Seleccione una Liga</p>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} className='mb-2'>
                    <Select
                        placeholder={selectedLeague ? <b>{leagues.find(league => league.id === selectedLeague)?.name}</b> : "Seleccione una liga"}
                        options={leagues.map(league => ({
                            label: league.name,
                            value: league.id,
                        }))}
                        style={{ width: '100%', maxWidth: '300px' }}
                        onChange={(value) => setSelectedLeague(value)}
                    />
                </Col>
            </Row>
            <Row gutter={[16, 16]}>
                {teams.map((team) => (
                    <Col key={team.id} xs={24} sm={12} md={8} lg={6}>
                        <Card
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '1rem'
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: '1rem'
                            }}>
                                <Image
                                    src={team.logo_url}
                                    alt={team.name}
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        objectFit: 'contain',
                                        cursor: 'pointer'
                                    }}
                                    preview={false}
                                    onClick={() => window.open("https://lol.fandom.com/wiki/" + team.name)}
                                />
                            </div>
                            <div style={{
                                textAlign: 'center',
                                width: '100%',
                                padding: '0 1rem'
                            }}>
                                <h2
                                    style={{
                                        textAlign: 'center',
                                        margin: 0,
                                        fontSize: '1.2rem'
                                    }}
                                >
                                    {team.name}
                                </h2>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    )
}
