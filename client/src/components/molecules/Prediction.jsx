import { Card, Row, Col, Button, Typography, Skeleton } from 'antd';
import PredictionForm from '../atoms/PredictionForm';
import { useEffect, useState } from 'react';
import { API } from '../../services/api';
import PredictionTable from '../atoms/PredictionTable';
import ResultTable from '../atoms/ResultTable';
import { Select } from 'antd';
import { useNavigate } from 'react-router-dom';

const Prediction = () => {
    const [send, setSend] = useState(false);
    const [matches, setMatches] = useState([]);
    const [matchesResult, setMatchesResult] = useState([]);
    const [results, setResults] = useState([]);
    const [hasPredicted, setHasPredicted] = useState(false);
    const [userPredictions, setUserPredictions] = useState([]);
    const [league, setLeague] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { Title, Text } = Typography;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setTimeout(() => {
                    setLoading(false);
                }, 2000);
                //Todas las ligas en las que el usuario esta unido
                const response = await API.get('/leagueParticipations/get/');
                const leaguePromises = response.map(participation =>
                    API.get('/leagues/get/' + participation.league_id)
                );
                const leagueArray = await Promise.all(leaguePromises);

                setLeague(leagueArray);

                if (leagueArray.length > 0) {
                    if (selectedLeague === null) {
                        leagueArray.sort((a, b) => b.id - a.id);
                        setSelectedLeague(leagueArray[0]?.id);
                    }

                    //Las matches por semana actual
                    const responseMatches = await API.get('/matches/getByWeek/' + selectedLeague);
                    console.log(responseMatches);
                    setMatches(responseMatches);

                    //Todos los resultados
                    const allResults = await API.get('/results/get');
                    setResults(allResults);

                    //Todos los matches
                    const allMatches = await API.get('/matches/getByLeague/' + selectedLeague);
                    setMatchesResult(allMatches);

                    //Todas las matches que tengan resultado
                    const matchesWithResults = allResults.map(result => {
                        const match = allMatches.find(match => match.id === result.match_id);
                        if (match) {
                            return match;
                        }
                        return null;
                    }).filter(Boolean);
                    setMatchesResult(matchesWithResults);

                    //Todas las predicciones del usuario
                    const responsePredictions = await API.get('/predictions/user');
                    setUserPredictions(responsePredictions);

                    if (responsePredictions) {
                        const predictedMatches = responseMatches.filter(match =>
                            responsePredictions.some(prediction => prediction.match_id === match.id)
                        );
                        const hasPredictions = predictedMatches.length === responseMatches.length;

                        if (!hasPredictions) {
                            setMatches(responseMatches.filter(match =>
                                !predictedMatches.some(predictedMatch => predictedMatch.id === match.id)
                            ));
                        }
                        setHasPredicted(hasPredictions);
                    }
                }
            } catch (error) {
                console.error('Error fetching prediction data:', error);
            }
        };

        fetchData();
    }, [selectedLeague])


    if (league.length === 0 && !loading) {
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
                    Únete a una liga existente para comenzar a hacer predicciones.
                </Text>
                <Button type="primary" onClick={() => navigate('/leagues/')} style={{ marginTop: '16px' }}>
                    Ver Ligas
                </Button>
            </div>
        );
    }

    return (
        <div className="container mt-5 mb-5">
            <Row gutter={[16, 24]} justify="start" className="mb-5">
                <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                    <Col span={8} className='mb-2'>
                        <p style={{ fontWeight: 'bold' }}>Seleccione una Liga</p>
                    </Col>
                    <Col span={16} className='mb-2'>
                        <Select
                            placeholder={selectedLeague ? <b>{league.find(league => league.id === selectedLeague)?.name}</b> : "Seleccione una liga"}
                            options={league.map(league => ({
                                label: league.name,
                                value: league.id,
                            }))}
                            style={{ width: '100%' }}
                            onChange={(value) => setSelectedLeague(value)}
                            value={selectedLeague}
                        />
                    </Col>
                </Col>
            </Row>
            <Row gutter={[16, 24]} justify="center">
                <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                    <Skeleton loading={loading} active>
                        <Card
                            title={window.innerWidth < 768 ? "" : hasPredicted ? "Partidos predichos" : "Partidos a predecir"}
                            extra={
                                window.innerWidth < 768 ? null : (
                                    <Button
                                        type="primary"
                                        onClick={() => setSend(true)}
                                        hidden={hasPredicted}
                                    >
                                        Hacer Predicciones
                                    </Button>
                                )
                            }
                        >
                            {hasPredicted ? (
                                <PredictionTable result={userPredictions} matches={matches} />
                            ) : (
                                <PredictionForm
                                    send={send}
                                    data={matches}
                                    leagueId={selectedLeague}
                                    setSend={() => setSend(false)}
                                />
                            )}

                            {window.innerWidth < 768 && (
                                <Row justify="center" style={{ marginTop: '16px' }}>
                                    <Button
                                        type="primary"
                                        onClick={() => setSend(true)}
                                        hidden={hasPredicted}
                                    >
                                        Hacer Predicciones
                                    </Button>
                                </Row>
                            )}
                        </Card>

                    </Skeleton>
                </Col>
                <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                    <Skeleton loading={loading} active>
                        <Card title="Historial de partidos">
                            <ResultTable results={results} matches={matchesResult} />
                        </Card>
                    </Skeleton>
                </Col>
            </Row>
        </div >
    )
}

export default Prediction
