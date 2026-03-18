import React, { useState, useEffect } from 'react';
import { Row, Col, Select, Avatar, Tooltip, Button, Skeleton, Card, Space, Typography, Divider, theme } from 'antd';
import { API } from '../../services/api';
import Coin from './Coin';
import { useNavigate } from 'react-router-dom';
import { showAlert } from './AlertInfo';
import ModalInfo from './ModalInfo';
import { SendOutlined } from '@ant-design/icons';

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
 * Component for making predictions on a list of matches.
 * 
 * @param {Object} props - Component props.
 * @param {boolean} props.send - Trigger to submit the form from outside.
 * @param {Function} props.setSend - Callback to reset the trigger.
 * @param {Array} props.data - The list of matches to predict.
 * @param {string|number} props.leagueId - The ID of the current league.
 * @returns {React.ReactElement} The PredictionForm component.
 */
export default function PredictionForm({ send, setSend, data, leagueId }) {
    const [selectedTeams, setSelectedTeams] = useState({});
    const [selectedResults, setSelectedResults] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const nav = useNavigate();
    const { token } = theme.useToken();

    /**
     * Effect to detect external trigger for submission.
     */
    useEffect(() => {
        if (send) {
            handleSubmit();
            setSend(false);
        }
    }, [send]);

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
     * Finalizes the submission of all predictions.
     */
    const sendPredictions = async () => {
        try {
            setIsSubmitting(true);
            const user = await API.getUserByToken();

            const predictionPromises = data.map(match => {
                const winnerId = selectedTeams[match.id];
                const result = match.format === 'BO1' ? '1-0' : selectedResults[match.id];
                
                return API.post('/predictions/set', {
                    user_id: user.id,
                    match_id: match.id,
                    winner: winnerId,
                    description: result,
                    type: 'score'
                });
            });

            await Promise.all(predictionPromises);
            showAlert('success', "¡Predicciones enviadas con éxito!");
            nav('/', { state: { leagueId } });
        } catch (error) {
            console.error("Error submitting predictions:", error);
            showAlert('error', "No se pudieron enviar las predicciones");
        } finally {
            setIsSubmitting(false);
            setModalOpen(false);
        }
    };

    /**
     * Validates and initiatives the submission process.
     */
    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        const allTeamsSelected = data.every(match => selectedTeams[match.id]);
        const allResultsSelected = data.every(match => match.format === 'BO1' || selectedResults[match.id]);

        if (!allTeamsSelected || !allResultsSelected) {
            showAlert('error', "Debes completar todas las predicciones antes de enviar.");
            return;
        }

        setModalOpen(true);
    };

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

                <ModalInfo
                    title="Confirmar Envío"
                    description="¿Estás listo para enviar tus predicciones? No podrás cambiarlas una vez enviadas."
                    open={modalOpen}
                    onSuccess={sendPredictions}
                    onClose={() => setModalOpen(false)}
                    okText="Confirmar"
                    cancelText="Cancelar"
                />
            </div>
        </Skeleton>
    );
}