import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../../services/api';
import { Table, Button, Space, Row, Col, Input, Card, Divider, Typography, Popconfirm, Tag } from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
    UndoOutlined,
    TableOutlined
} from '@ant-design/icons';
import ModalInfo from './ModalInfo';
import BasicForm from './BasicForm';
import { showAlert } from './AlertInfo';
import dayjs from 'dayjs';

const { Search } = Input;
const { Text } = Typography;

// ── Column renderer helpers ───────────────────────────────────────────────────
const renderCell = (key, text) => {
    if (key === 'logo_url' && text) {
        return <img src={text} alt="logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4 }} />;
    }
    // Any array of objects → join readable labels
    if (Array.isArray(text)) {
        if (text.length === 0) return '-';
        return text.map(t => t.name || t.label || t.username || t.toString()).join(', ');
    }
    // Single objects → extract readable label
    if (typeof text === 'object' && text !== null) {
        return text.name || text.username || '-';
    }
    if (text === null || text === undefined || text === '') return '-';
    return <Text ellipsis>{text.toString()}</Text>;
};

/**
 * A generic data management component for administrative tasks.
 */
const AdminPanel = ({ table, names, fields, relation }) => {
    const [data, setData]                   = useState([]);
    const [filteredData, setFilteredData]   = useState([]);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [recordToProcess, setRecordToProcess] = useState(null);
    const [selectData, setSelectData]       = useState([]);
    const [viewMode, setViewMode]           = useState('TABLE');
    const [maxTagCount, setMaxTagCount]     = useState(0);
    const [loading, setLoading]             = useState(false);

    // ── Fetch main data ───────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await API.get(`/${table}/get`);

            const processed = response.map(item => {
                const entry = { ...item };

                // ── Pre-extract readable labels before cleanup ──────────────
                // 1. Role name (users tab)
                if (entry.Role?.name) {
                    entry.roles = entry.Role.name;
                }

                // 2. League name instead of league_id (matches tab)
                if (entry.League?.name) {
                    entry._leagueName = entry.League.name;
                }

                // 3. Match label (results + predictions)
                if (entry.Match?.Teams?.length) {
                    entry._matchLabel = entry.Match.Teams.map(t => t.name).join(' vs ');
                }

                // 4. Winner team name (results + predictions)
                if (entry.Winner?.name) {
                    entry._winnerName = entry.Winner.name;
                } else if (entry.WinnerTeam?.name) {
                    entry._winnerName = entry.WinnerTeam.name;
                }

                // ── Cleanup: dates + nested objects ────────────────────────
                Object.keys(entry).forEach(key => {
                    if (key.startsWith('_')) return; // keep our helpers
                    if (key.endsWith('_date') || key.includes('date')) {
                        if (entry[key]) entry[key] = dayjs(entry[key]).format('DD-MM-YYYY HH:mm');
                    }
                    if (typeof entry[key] === 'object' && entry[key] !== null && !Array.isArray(entry[key])) {
                        delete entry[key];
                    }
                });

                return entry;
            });

            setData(processed);
            setFilteredData(processed);
        } catch (err) {
            showAlert('error', `Error al cargar ${table}: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [table]);

    useEffect(() => {
        fetchData();
        if (table === 'matches') setMaxTagCount(2);
    }, [table, fetchData]);

    // ── Load relational data for selects ──────────────────────────────────────
    const loadRelations = async () => {
        if (!relation) return [];
        const finalData = [];

        for (const item of relation) {
            try {
                const endpoint = item === 'matches' ? '/matches/getWithoutResult' : `/${item}/get`;
                const response = await API.get(endpoint);
                finalData.push({
                    name: item,
                    data: response.map(res => {
                        let label = res.name || res.username;
                        if (!label && res.Teams) label = res.Teams.map(t => t.name).join(' vs ');
                        return { value: res.id, label: label || `ID: ${res.id}`, format: res.format };
                    })
                });
            } catch (err) {
                console.error(`Error fetching relation ${item}:`, err);
            }
        }
        setSelectData(finalData);
        return finalData;
    };

    // ── Build columns from data ───────────────────────────────────────────────
    const getColumns = () => {
        if (data.length === 0) return [];

        // Collect display keys: replace league_id / match_id / winner with friendly versions
        const allKeys = Object.keys(data[0]).filter(k => !k.startsWith('_'));

        const columns = allKeys.map(key => {
            let title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let dataIndex = key;

            // Override league_id → show league name
            if (key === 'league_id') {
                title = 'Liga';
                return {
                    title, key, dataIndex: key, ellipsis: true,
                    render: (_, record) => <Text ellipsis>{record._leagueName || record[key]}</Text>
                };
            }
            // Override match_id → show "TeamA vs TeamB"
            if (key === 'match_id') {
                title = 'Partido';
                return {
                    title, key, dataIndex: key, ellipsis: true,
                    render: (_, record) => <Text ellipsis>{record._matchLabel || record[key]}</Text>
                };
            }
            // Override winner → show team name
            if (key === 'winner') {
                title = 'Ganador';
                return {
                    title, key, dataIndex: key, ellipsis: true,
                    render: (_, record) => <Text ellipsis>{record._winnerName || record[key]}</Text>
                };
            }

            return {
                title,
                dataIndex,
                key,
                ellipsis: true,
                render: (text) => renderCell(key, text),
            };
        });

        // Actions column
        columns.push({
            title: 'Acciones',
            key: 'actions',
            width: 130,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined className="text-primary" />}
                        onClick={async () => {
                            setLoading(true);
                            await loadRelations();
                            setRecordToProcess([record]);
                            setViewMode('EDIT');
                            setLoading(false);
                        }}
                    />
                    <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => { setRecordToProcess(record); setOpenDeleteModal(true); }}
                    />
                    {table === 'users' && (
                        <Popconfirm
                            title="¿Restablecer contraseña?"
                            onConfirm={async () => {
                                await API.put(`/users/resetPassword/${record.id}`);
                                showAlert('success', 'Contraseña restablecida');
                            }}
                        >
                            <Button type="text" size="small" icon={<UndoOutlined className="text-warning" />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        });

        return columns;
    };

    // ── Search ────────────────────────────────────────────────────────────────
    const handleSearch = (value) => {
        const lower = value.toLowerCase();
        const filtered = data.filter(item =>
            Object.values(item).some(val => val?.toString().toLowerCase().includes(lower))
        );
        setFilteredData(filtered);
    };

    const handleActionSuccess = () => { setViewMode('TABLE'); fetchData(); };

    // ── Render ────────────────────────────────────────────────────────────────
    if (viewMode === 'CREATE' || viewMode === 'EDIT') {
        return (
            <Card title={<Space><TableOutlined />{viewMode === 'CREATE' ? 'Nuevo Registro' : 'Editar Registro'}</Space>} className="border-0 shadow-sm">
                <BasicForm
                    fields={fields}
                    names={names}
                    record={recordToProcess}
                    table={table}
                    selectData={selectData}
                    maxTagCount={maxTagCount}
                    onCancel={() => setViewMode('TABLE')}
                    onSuccess={handleActionSuccess}
                />
            </Card>
        );
    }

    return (
        <div>
            <Row justify="space-between" align="middle" gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12}>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={async () => {
                            setLoading(true);
                            await loadRelations();
                            setRecordToProcess(null);
                            setViewMode('CREATE');
                            setLoading(false);
                        }}
                    >
                        Crear
                    </Button>
                </Col>
                <Col xs={24} sm={12} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Search
                        placeholder="Buscar..."
                        allowClear
                        onSearch={handleSearch}
                        onChange={e => handleSearch(e.target.value)}
                        style={{ width: '100%', maxWidth: 280 }}
                    />
                </Col>
            </Row>

            <Table
                rowKey="id"
                loading={loading}
                dataSource={filteredData}
                columns={getColumns()}
                pagination={{ pageSize: 8, position: ['bottomCenter'], size: 'small' }}
                scroll={{ x: 'max-content' }}
                size="small"
            />

            <ModalInfo
                open={openDeleteModal}
                title="Confirmar Eliminación"
                description={`¿Eliminar este registro de ${table}? Esta acción no se puede deshacer.`}
                okText="Eliminar"
                cancelText="Cancelar"
                onSuccess={async () => {
                    try {
                        await API.delete(`/${table}/delete/${recordToProcess.id}`);
                        showAlert('success', 'Registro eliminado');
                        setOpenDeleteModal(false);
                        fetchData();
                    } catch {
                        showAlert('error', 'No se pudo eliminar el registro');
                    }
                }}
                onClose={() => setOpenDeleteModal(false)}
            />
        </div>
    );
};

export default AdminPanel;
