import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Avatar, Tooltip, Typography, Image, Button } from 'antd';
import { API } from '../../services/api';
import { UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

function Home() {
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [matches, setMatches] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const nav = useNavigate();

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);

                // 1. Cargar ligas
                const allLeaguesParticipants = await API.get('/leagueParticipations/get/');
                const leaguePromises = allLeaguesParticipants.map(p =>
                    API.get('/leagues/get/' + p.league_id)
                );
                const leagueArray = await Promise.all(leaguePromises);
                setLeagues(leagueArray);

                // 2. Seleccionar liga si no hay una ya seleccionada
                let leagueId = selectedLeague;
                if (!selectedLeague && leagueArray.length > 0) {
                    leagueId = leagueArray[0].id;
                    if (location.state && location.state.leagueId) {
                        console.log(location.state.leagueId);
                        leagueId = location.state.leagueId;
                        setSelectedLeague(leagueId);
                    } else {
                        setSelectedLeague(leagueId);
                    }
                }

                if (!leagueId) {
                    setLoading(false);
                    return;
                }

                // 3. Participantes
                const participantsResponse = await API.get('/leagueParticipations/get/participants/' + leagueId);
                setParticipants(participantsResponse);

                // 4. Partidos
                const matchesResponse = await API.get('/matches/getByWeek/' + leagueId);
                setMatches(matchesResponse);

                // 5. Predicciones
                const predictionsArray = [];
                for (const match of matchesResponse) {
                    const response = await API.get('/predictions/getByMatch/' + match.id);
                    predictionsArray.push(...response);
                }
                setPredictions(predictionsArray);

                // 6. Resultados
                const resultsArray = await Promise.all(
                    matchesResponse.map(match =>
                        API.get('/results/getByMatch/' + match.id).then(res => res).catch(() => null)
                    )
                );
                setResults(resultsArray.filter(Boolean));

                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        fetchAllData();
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
                <Title className='noContent' level={3}>No estás unido a ninguna liga</Title>
                <Text className='noContent' style={{ marginTop: '16px', fontSize: '16px' }}>
                    Únete a una liga existente.
                </Text>
                <Button type="primary" onClick={() => nav('/leagues/')} style={{ marginTop: '16px' }}>
                    Ver ligas
                </Button>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <Select
                    value={selectedLeague}
                    onChange={setSelectedLeague}
                    style={{ width: 300 }}
                    loading={leagues.length === 0}
                >
                    {leagues.map(league => (
                        <Option key={league.id} value={league.id}>
                            {league.name}
                        </Option>
                    ))}
                </Select>
            </div>

            <Row gutter={[16, 16]}>
                {/* Clasificación */}
                <Col xs={24} md={5}>
                    <Card title="Clasificación" loading={loading}>
                        {participants
                            .slice()
                            .sort((a, b) => b.points - a.points)
                            .map((participation, index) => (
                                <div
                                    key={participation.User.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px 0',
                                        borderBottom: '1px solid #f0f0f0'
                                    }}
                                >
                                    <Text strong style={{ width: 30 }}>{index + 1}.</Text>
                                    <Avatar
                                        src={participation.User.logo_url}
                                        icon={<UserOutlined />}
                                        style={{ marginRight: '1rem' }}
                                    />
                                    <Text style={{ flex: 1 }}>{participation.User.username}</Text>
                                    <Text strong>{participation.points} pts</Text>
                                </div>
                            ))}
                    </Card>
                </Col>

                {/* Predicciones */}
                <Col xs={24} md={18}>
                    <Card title="Predicciones de la semana" loading={loading} style={{ height: '100%' }}>

                        {/* Encabezado: Partidos */}
                        <div className="d-flex align-items-center mb-3 flex-wrap">
                            <div style={{ minWidth: 60 }}>
                                <Text strong>Partidos</Text>
                            </div>
                            <div className="d-flex flex-grow-1 justify-content-start gap-2 flex-wrap">
                                {matches.map((match) => (
                                    <Tooltip title={match.Teams[0]?.name + ' vs ' + match.Teams[1]?.name}>

                                        <div
                                            key={match.id}
                                            className="text-center rounded shadow-sm"
                                            style={{ minWidth: 140, flex: '1 0 140px' }}
                                        >
                                            <div className="d-flex align-items-center justify-content-center mb-2">
                                                <Image preview={false} src={match.Teams[0]?.logo_url} width={24} height={24} />
                                                <Text strong className="mx-2">vs</Text>
                                                <Image preview={false} src={match.Teams[1]?.logo_url} width={24} height={24} />
                                            </div>
                                        </div>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>

                        {/* Participantes y predicciones */}
                        {participants.map((participation) => (
                            <div key={participation.User.id} className="d-flex align-items-center py-3 border-bottom flex-wrap">

                                {/* Usuario */}
                                <Tooltip title={participation.User.username}>

                                    <div style={{ minWidth: 60 }} className="d-flex align-items-center ps-2 pe-2">
                                        <Avatar
                                            src={participation.User.logo_url}
                                            icon={<UserOutlined />}
                                            className="me-2"
                                        />
                                    </div>
                                </Tooltip>

                                {/* Predicciones */}
                                < div className="d-flex flex-grow-1 justify-content-start gap-2 flex-wrap" >
                                    {
                                        matches.map((match) => {
                                            const prediction = predictions.find(
                                                (p) => p.match_id === match.id && p.User?.id === participation.User?.id
                                            );
                                            const result = results.find((r) => r.match_id === match.id);
                                            const predictedTeam = prediction?.winner
                                                ? match.Teams.find(team => team.id === prediction.winner)
                                                : null;
                                            const backgroundColor = (() => {
                                                if (prediction?.winner === undefined) {
                                                    // No hizo predicción aún
                                                    return 'rgba(240, 240, 240, 0.2)';
                                                }

                                                if (!result) {
                                                    // Hay predicción, pero aún no llegó el resultado
                                                    return 'rgba(154, 176, 218, 0.2)';
                                                }

                                                // Hay predicción y resultado, ahora comparar
                                                return result?.winner === prediction?.winner
                                                    ? 'rgba(40, 167, 69, 0.2)' // Predicción acertada
                                                    : 'rgba(214, 148, 148, 0.34)'; // Predicción fallida
                                            })();


                                            return (
                                                <Tooltip title={predictedTeam?.name}>

                                                    <div
                                                        key={match.id}
                                                        className="text-center px-3 py-2 rounded"
                                                        style={{
                                                            minWidth: 140,
                                                            flex: '1 0 140px',
                                                            backgroundColor,
                                                            border: '1px solid #f0f0f0'
                                                        }}
                                                    >
                                                        {predictedTeam ? (
                                                            <Image
                                                                preview={false}
                                                                src={predictedTeam.logo_url}
                                                                alt={predictedTeam.name}
                                                                width={32}
                                                                height={32}
                                                                style={{
                                                                    borderRadius: 4,
                                                                    padding: 4,
                                                                    marginBottom: 4
                                                                }}
                                                            />
                                                        ) : (
                                                            <Text strong style={{ fontSize: 12 }}>TBD</Text>
                                                        )}

                                                        {prediction?.description && (
                                                            <div className="d-flex justify-content-center" style={{ width: '100%' }}>
                                                                <div className="px-2 py-1 rounded" style={{
                                                                    maxWidth: '100%',
                                                                    textAlign: 'center',
                                                                    fontSize: '0.8rem'
                                                                }}>
                                                                    <Text type="secondary">
                                                                        {(() => {
                                                                            if (!result) return prediction?.description;
                                                                            const isCorrectPrediction =
                                                                                prediction?.description === result?.result &&
                                                                                prediction?.winner === result?.winner;
                                                                            return isCorrectPrediction ? prediction?.description : '';
                                                                        })()}
                                                                    </Text>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Tooltip>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row >

        </div >
    );
}

export default Home;