import { Table, Image, Skeleton, Tooltip } from 'antd';
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
                vs: result.result
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
                    width={window.innerWidth < 768 ? 25 : 50}
                    height={window.innerWidth < 768 ? 25 : 50}
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
            render: (text) => (
                <div style={{ fontWeight: 'bold', fontSize: window.innerWidth < 768 ? '0.8rem' : '1.1rem', textAlign: 'center' }}>
                    <Tooltip title={text}>
                        vs
                    </Tooltip>
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
                    width={window.innerWidth < 768 ? 25 : 50}
                    height={window.innerWidth < 768 ? 25 : 50}
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
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }} className='d-none d-sm-table-cell'>
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
            className='mx-auto overflow-x-auto'
            style={{ maxWidth: '100%' }}

        >
            <Table
                columns={columns}
                dataSource={joinedData}
                pagination={{ pageSize: 5 }}
                size="small"
                showHeader={false}
                scroll={{ x: true }}
                rowClassName={() => 'result-table-row'}
                loading={joinedData.length === 0}
                locale={{
                    emptyText: (
                        <Skeleton
                            avatar={{ size: 'large' }}
                            paragraph={{ rows: 5 }}
                            active
                        />
                    ),
                }}
            />
        </div>
    );
};

export default ResultTable;
