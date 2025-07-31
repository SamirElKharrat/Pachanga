import { Table, Image } from 'antd';
import { useEffect, useState } from 'react';

const ResultTable = ({ results, matches }) => {
    const [joinedData, setJoinedData] = useState([]);

    useEffect(() => {
        const joined = results.map(result => {
            const match = matches.find(match => match.id === result.match_id);
            if (!match) return null;

            return {
                key: `${result.match_id}`,
                match: match.Teams.find(team => team.id !== result.winner).logo_url,
                winner: match.Teams.find(team => team.id === result.winner).logo_url,
                result: result.result,
            };
        }).filter(Boolean);
        setJoinedData(joined);
    }, [results, matches]);

    const columns = [
        {
            dataIndex: 'match',
            key: 'match',
            render: (url) => (
                <Image
                    src={url}
                    preview={false}
                    width={50}
                    height={50}
                    style={{
                        objectFit: 'contain',
                        opacity: 0.4,
                        borderRadius: 0,
                    }}
                />
            ),
            align: 'center',
        },
        {
            dataIndex: 'vs',
            key: 'vs',
            render: () => (
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}>
                    vs
                </div>
            ),
            align: 'center',
        },
        {
            dataIndex: 'winner',
            key: 'winner',
            render: (url) => (
                <Image
                    src={url}
                    preview={false}
                    width={50}
                    height={50}
                    style={{
                        objectFit: 'contain',
                        borderRadius: 0,
                    }}
                />
            ),
            align: 'center',
        },
        {
            dataIndex: 'result',
            key: 'result',
            render: (text) => (
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}>
                    {text}
                </div>
            ),
            align: 'center',
        },
    ];

    if (joinedData.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <span style={{ fontSize: '1.5rem' }}>No hay resultados disponibles</span>
            </div>
        );
    }

    return (
        <div
            style={{
                maxWidth: '100%',
                margin: '0 auto',
                padding: '1rem',
                overflowX: 'auto',
            }}
        >
            <Table
                columns={columns}
                dataSource={joinedData}
                pagination={{ pageSize: 4 }}
                size="middle"
                showHeader={false}
                scroll={{ y: 310 }}
                style={{
                    borderRadius: '8px',
                    boxShadow: 'none',
                }}
                rowClassName={() => 'result-table-row'}
            />
        </div>
    );
};

export default ResultTable;
