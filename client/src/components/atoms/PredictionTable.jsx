import React from 'react'
import { Image, Tooltip } from 'antd'

const PredictionTable = ({ result, matches }) => {
    // Check if there are no predictions
    const hasNoPredictions = matches.every(match =>
        !result?.some(pred => pred.match_id === match.id)
    )

    if (hasNoPredictions) {
        return (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>No hay predicciones disponibles</span>
            </div>
        )
    }

    return (
        <table className="container">
            <tbody>
                {matches.map(match => {
                    const prediction = result?.find(pred => pred.match_id === match.id)

                    return (
                        <tr key={match.id}>
                            <td style={{ textAlign: 'center' }}>
                                <div className="team-info">
                                    <Tooltip title={match.Teams[0]?.name}>
                                        <Image
                                            preview={false}
                                            src={match.Teams[0]?.logo_url}
                                            alt={match.Teams[0]?.name}
                                            style={{
                                                width: window.innerWidth < 768 ? '2rem' : '4rem',
                                                height: window.innerWidth < 768 ? '2rem' : '4rem',
                                                objectFit: 'cover',
                                                margin: '0 10px',
                                                opacity: match.Teams[0]?.id === prediction?.winner ? 1 : 0.3
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            </td>
                            <td>
                                <span style={{ fontSize: window.innerWidth < 768 ? '1rem' : '1.5rem' }}>vs</span>
                            </td>
                            <td style={{ padding: window.innerWidth < 768 ? '0.5rem 0 0 0' : '1rem 0 0 0', textAlign: 'center' }}>
                                <div className="team-info">
                                    <Tooltip title={match.Teams[1]?.name}>
                                        <Image
                                            preview={false}
                                            src={match.Teams[1]?.logo_url}
                                            alt={match.Teams[1]?.name}
                                            style={{
                                                width: window.innerWidth < 768 ? '2rem' : '4rem',
                                                height: window.innerWidth < 768 ? '2rem' : '4rem',
                                                objectFit: 'cover',
                                                margin: '0 10px',
                                                opacity: match.Teams[1]?.id === prediction?.winner ? 1 : 0.3
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            </td>
                            <td style={{ paddingRight: '1rem', fontWeight: 'bold', fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem' }}>
                                <div>
                                    <span>
                                        {prediction?.description || prediction?.result}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}

export default PredictionTable
