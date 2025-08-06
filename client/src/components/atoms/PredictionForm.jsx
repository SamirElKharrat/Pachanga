import React, { useEffect, useState } from 'react'
import { Row, Col, Select, Image, Tooltip, Button, Skeleton } from 'antd'
import { API } from '../../services/api'
import Coin from './Coin';
import { useNavigate } from 'react-router-dom'
import { showAlert } from './AlertInfo';


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
        case 'BO1':
            return [
                { value: '1-0', label: '1-0' },
            ];
        default:
            return [];
    }
};

export default function PredictionForm({ send, setSend, data, leagueId, setFormLoading }) {
    const [selectedTeams, setSelectedTeams] = useState([])
    const [selectedResults, setSelectedResults] = useState([])
    const nav = useNavigate()

    useEffect(() => {
        setFormLoading(false);

        return () => {
            setFormLoading(true);
        };
    }, [setFormLoading]);

    useEffect(() => {
        if (send) {
            document.getElementById('submit').click()
            setSend(false)
        }
    }, [send, setSend])

    const handleSelected = (side, matchId) => {
        const team = data.map((match) => match.Teams.find(t => t.name === side)).filter(Boolean).at(0)
        const images = document.querySelector(`.image${matchId}`).querySelectorAll('img')

        // Actualizar la selección existente para este partido
        setSelectedTeams((prev) => {
            const index = prev.findIndex(t => t.match_id === matchId)
            if (index !== -1) {
                // Reemplazar la selección existente
                return [...prev.slice(0, index), { winner: team.id, match_id: matchId }, ...prev.slice(index + 1)]
            } else {
                // Si no existe, añadir nueva selección
                return [...prev, { winner: team.id, match_id: matchId }]
            }
        })

        // Actualizar opacidades de las imágenes
        images.forEach(img => {
            if (img.alt === team.name) {
                img.style.opacity = '1'
            } else {
                img.style.opacity = '0.3'
            }
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        //Si falta equipos por seleccionar o poner resulados no se manda y suelta error
        if (selectedTeams.length !== data.length || selectedResults.length !== data.length) {
            e.preventDefault()
            showAlert('error', "Por favor, seleccione equipos y resultados para todos los partidos.")
            return;
        }

        const user = await API.getUserByToken()

        // Combinar los datos
        const predictions = selectedTeams.map((team) => ({
            user_id: user.id,
            match_id: team.match_id,
            winner: team.winner,
            description: selectedResults.find((result) => result.match_id === team.match_id)?.result,
            type: 'score'
        }))

        try {
            predictions.forEach(async (prediction) => {
                await API.post('/predictions/set', prediction)
            })
            showAlert('success', "Predicciones guardadas correctamente.")
            nav('/', { state: { leagueId: leagueId } })
        } catch (error) {
            console.error(error)
            showAlert('error', "Error al guardar predicciones.")
        }

    }
    return (
        <Skeleton loading={data.length === 0} active>
            <form onSubmit={handleSubmit} >
                {data.map((match) => (
                    <Row key={match.id} className='m-4' style={{ display: 'flex', alignItems: 'center' }}>
                        <Col span={8}>
                            <div className={`image${match.id}`} style={{ display: 'flex', alignItems: 'center' }}>
                                {match.Teams.map((team, index) => (
                                    <>
                                        <Tooltip title={team.name} placement='topRight'>
                                            <Image id={team.id} src={team.logo_url} alt={team.name} width={50} preview={false} style={{ marginLeft: '1rem' }} onClick={() => handleSelected(team.name, match.id)} />
                                        </Tooltip>
                                        {index === 0 ? <span style={{ marginLeft: '2rem' }}>vs</span> : null}
                                    </>
                                ))}
                            </div>
                        </Col>
                        <Col span={4} style={{ marginRight: '2rem' }}>
                            <Coin
                                teams={[
                                    match.Teams[0],
                                    match.Teams[1]
                                ]}
                                onSuccess={(side) => handleSelected(side, match.id)}
                            />
                        </Col>
                        <Col span={10}>
                            <Select
                                onChange={(value) => {
                                    setSelectedResults((prev) => {
                                        const index = prev.findIndex(r => r.match_id === match.id);
                                        if (index !== -1) {
                                            return [...prev.slice(0, index), { match_id: match.id, result: value }, ...prev.slice(index + 1)];
                                        } else {
                                            return [...prev, { match_id: match.id, result: value }];
                                        }
                                    });
                                }}
                                options={getBOOptions(match.format)}
                                style={{ width: '100%' }}
                            />
                        </Col>
                    </Row>
                ))}
                <Button hidden id='submit' type="primary" htmlType="submit">Enviar</Button>
            </form>
        </Skeleton>
    );
}