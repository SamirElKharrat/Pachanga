import React, { useState, useEffect } from 'react';
import { Row, Col, Select, Avatar, Skeleton, Card, Space, Typography, theme } from 'antd';
import Coin from './Coin';

const { Text } = Typography;

/**
 * Helper to get prediction options for a given match format.
 * @param {string} format - The match format (e.g., 'BO3', 'BO5').
 * @returns {Array<{value: string, label: string}>} The available score options.
 */
const getBOOptions = (format) => {
    switch (format) {
        case 'BO5':
            return [
                { value: '3-0', label: '3-0' },
                { value: '3-1', label: '3-1' },
                { value: '3-2', label: '3-2' }
            ];
        case 'BO3':
            return [
                { value: '2-0', label: '2-0' },
                { value: '2-1', label: '2-1' }
            ];
        default:
            return [];
    }
};

/**
 * Los partidos de la jornada, para rellenar.
 *
 * Solo recoge lo que se elige: no envía nada. La jornada se manda entera —partidos y
 * preguntas a la vez— y eso solo puede orquestarlo quien ve las dos cosas, que es
 * Prediction.jsx. Si el envío viviera aquí, «todo junto» sería imposible de
 * garantizar.
 *
 * @param {Object} props - Component props.
 * @param {Array} props.data - The list of matches to predict.
 * @param {Function} props.onChange - Recibe { done, total, payload } cada vez que
 *   cambia algo. `payload` es lo que hay que mandar a /predictions/set.
 * @returns {React.ReactElement} The PredictionForm component.
 */
export default function PredictionForm({ data, onChange }) {
    const [selectedTeams, setSelectedTeams] = useState({});
    const [selectedResults, setSelectedResults] = useState({});
    const { token } = theme.useToken();

    /**
     * Handles selecting a team for a specific match.
     * @param {number} teamId - The selected team's ID.
     * @param {number} matchId - The match ID.
     */
    const handleTeamSelect = (teamId, matchId) => {
        setSelectedTeams(prev => ({
            ...prev,
            [matchId]: teamId
        }));
    };

    /**
     * Informa hacia arriba de lo que hay relleno y de lo que habría que enviar.
     *
     * Un partido está completo cuando tiene ganador y —salvo en BO1, que no lo
     * lleva— marcador.
     */
    useEffect(() => {
        if (!onChange) return;

        const complete = data.filter(match =>
            selectedTeams[match.id] && (match.format === 'BO1' || selectedResults[match.id])
        );

        onChange({
            done: complete.length,
            total: data.length,
            payload: complete.map(match => ({
                match_id: match.id,
                winner: selectedTeams[match.id],
                description: match.format === 'BO1' ? '1-0' : selectedResults[match.id],
                type: 'score'
            }))
        });
    }, [selectedTeams, selectedResults, data, onChange]);

    return (
        <Skeleton loading={data.length === 0} active>
            <div className="prediction-form">
                {data.map((match) => (
                    <Card key={match.id} className="mb-2 border-0 bg-transparent" styles={{ body: { padding: '4px 8px' } }}>
                        <Row align="middle" gutter={[12, 12]}>
                            <Col xs={24} md={10} lg={8}>
                                <div className="d-flex align-items-center justify-content-between">
                                    {match.Teams.map((team, index) => (
                                        <React.Fragment key={team.id}>
                                            <div
                                                className="p-1 rounded cursor-pointer transition-all"
                                                style={{
                                                    borderRadius: 6,
                                                    boxShadow: selectedTeams[match.id] === team.id ? `0 0 10px ${token.colorPrimary}40` : 'none',
                                                    background: selectedTeams[match.id] === team.id ? `${token.colorPrimary}1a` : token.colorFillTertiary,
                                                    border: selectedTeams[match.id] === team.id ? `1px solid ${token.colorPrimary}` : '1px solid transparent'
                                                }}
                                                onClick={() => handleTeamSelect(team.id, match.id)}
                                            >
                                                <Avatar
                                                    src={team.logo_url}
                                                    alt={team.name}
                                                    shape="square"
                                                    size={window.innerWidth < 768 ? 32 : 40}
                                                    style={{ pointerEvents: 'none' }}
                                                />
                                            </div>
                                            {index === 0 && <Text strong className="mx-2 text-secondary" style={{ minWidth: 24, textAlign: 'center', fontSize: 10 }}>VS</Text>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </Col>

                            <Col xs={24} md={14} lg={16}>
                                <Space className="w-100 justify-content-start ps-md-4" size="large">
                                    <Coin
                                        teams={match.Teams}
                                        onSuccess={(sideName) => {
                                            const team = match.Teams.find(t => t.name === sideName);
                                            if (team) handleTeamSelect(team.id, match.id);
                                        }}
                                    />
                                    {match.format !== 'BO1' && (
                                        <Select
                                            placeholder="Resultado"
                                            size="middle"
                                            value={selectedResults[match.id]}
                                            onChange={(val) => setSelectedResults(prev => ({ ...prev, [match.id]: val }))}
                                            options={getBOOptions(match.format)}
                                            style={{ minWidth: 120 }}
                                        />
                                    )}
                                </Space>
                            </Col>
                        </Row>
                    </Card>
                ))}
            </div>
        </Skeleton>
    );
}
