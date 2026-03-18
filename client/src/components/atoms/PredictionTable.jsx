import { Table, Typography, Avatar, theme } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Component for displaying a table of user predictions for a set of matches.
 * 
 * @param {Object} props - Component props.
 * @param {Array} props.result - User predictions array.
 * @param {Array} props.matches - List of matches involved.
 * @returns {React.ReactElement} The PredictionTable component.
 */
const PredictionTable = ({ result, matches }) => {
    const { token } = theme.useToken();

    const dataSource = matches.map(match => {
        const prediction = result?.find(pred => pred.match_id === match.id);
        return {
            key: match.id,
            match,
            prediction
        };
    });

    const columns = [
        {
            title: 'Apuesta',
            key: 'bet',
            render: (_, record) => {
                const team1 = record.match.Teams[0];
                const team2 = record.match.Teams[1];
                const winnerId = record.prediction?.winner;

                return (
                    <div className="d-flex align-items-center w-100 py-1">
                        {/* Match section */}
                        <div className="d-flex align-items-center justify-content-center flex-grow-1" style={{ gap: '20px' }}>
                            <Avatar
                                src={team1?.logo_url}
                                shape="square"
                                size={44}
                                style={{ 
                                    opacity: winnerId === team1?.id ? 1 : 0.25,
                                    border: winnerId === team1?.id ? '2px solid rgba(59, 130, 246, 0.6)' : 'none',
                                    padding: 2,
                                    background: token.colorFillAlter
                                }}
                            />
                            <Text type="secondary" style={{ fontSize: 13, fontWeight: 'bold', width: 30, textAlign: 'center' }}>VS</Text>
                            <Avatar
                                src={team2?.logo_url}
                                shape="square"
                                size={44}
                                style={{ 
                                    opacity: winnerId === team2?.id ? 1 : 0.25,
                                    border: winnerId === team2?.id ? '2px solid rgba(59, 130, 246, 0.6)' : 'none',
                                    padding: 2,
                                    background: token.colorFillAlter
                                }}
                            />
                        </div>
                        
                        {/* Result section */}
                        <div className="ms-auto" style={{ minWidth: 60, textAlign: 'right' }}>
                            {record.prediction?.description && (
                                <Text strong style={{ fontSize: 18, color: '#3b82f6', letterSpacing: '1px' }}>
                                    {record.prediction.description}
                                </Text>
                            )}
                        </div>
                    </div>
                );
            }
        }
    ];

    return (
        <Table
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            size="small"
            showHeader={false}
            className="prediction-table-compact"
            locale={{ emptyText: "No hay predicciones para mostrar." }}
            rowClassName={() => 'compact-row'}
            style={{ marginTop: -8 }}
        />
    );
};

export default PredictionTable;
