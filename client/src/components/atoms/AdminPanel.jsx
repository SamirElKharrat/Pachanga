import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../../services/api';
import { Table, Button, Space, Row, Col, Input, Card, Divider, Typography, Popconfirm, Tag, List, Empty, Flex } from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
    UndoOutlined,
    TableOutlined,
    UnorderedListOutlined,
    SendOutlined,
    CloseOutlined
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
    // La cola del modo masivo: lo que se ha ido añadiendo y todavía no se ha enviado.
    const [queue, setQueue]                 = useState([]);
    const [sending, setSending]             = useState(false);

    // ── Fetch main data ───────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await API.get(`/${table}/get`);

            // Una respuesta con forma rara acababa en «response.map is not a
            // function», que no dice nada de lo que ha pasado de verdad: casi siempre
            // es que la ruta no existe todavía en el servidor que está corriendo.
            if (!Array.isArray(response)) {
                throw new Error('la respuesta del servidor no es una lista; comprueba que la ruta existe y que el servidor está reiniciado');
            }

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
                
                let resList = Array.isArray(response) ? response : [];

                // Las preguntas se escriben para la jornada que viene, igual que se
                // dan de alta los partidos: solo interesan las ligas vivas, y la más
                // reciente primero.
                if ((table === 'matches' || table === 'questions') && item === 'leagues') {
                    resList = resList.filter(l => l.status === 'scheduled' || l.status === 'live');
                    resList.sort((a, b) => (b.id || 0) - (a.id || 0));
                }

                finalData.push({
                    name: item,
                    data: resList.map(res => {
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

    // ── Modo masivo ───────────────────────────────────────────────────────────
    //
    // Sirve para meter de un tirón las cosas que siempre vienen en tanda: los cinco
    // partidos de una jornada, las dos preguntas de la semana. Se van añadiendo a
    // una lista sin salir del formulario y se mandan todas al final.

    /** Un resumen legible de una fila en cola, resolviendo ids a nombres si se puede. */
    const summarize = (payload) => {
        const etiqueta = (clave, valor) => {
            if (valor === null || valor === undefined || valor === '') return null;
            // Una URL de imagen no dice nada en una línea de texto.
            if (clave === 'logo_url') return null;

            // league_id viene de la relación `leagues`; los equipos, de `teams`.
            const rel = clave === 'league_id' ? 'leagues' : (clave === 'teams' ? 'teams' : null);
            const opciones = rel ? selectData.find(d => d.name === rel)?.data : null;
            const nombre = (v) => opciones?.find(o => o.value === v)?.label ?? v;

            if (Array.isArray(valor)) {
                // «vs» solo entre equipos; en cualquier otra lista sería un disparate.
                return valor.map(nombre).join(clave === 'teams' ? ' vs ' : ', ');
            }
            if (clave.includes('date') || clave.endsWith('_at')) {
                const d = dayjs(valor);
                if (d.isValid()) return d.format('DD-MM-YYYY HH:mm');
            }
            return String(nombre(valor));
        };

        return Object.entries(payload)
            .map(([k, v]) => etiqueta(k, v))
            .filter(Boolean)
            .join(' · ');
    };

    /** Manda la cola entera, una a una, y se queda con lo que haya fallado. */
    const sendQueue = async () => {
        setSending(true);
        const endpoint = table === 'users' ? '/users/register' : `/${table}/set`;
        const fallidas = [];

        for (const item of queue) {
            try {
                await API.post(endpoint, item.payload);
            } catch (err) {
                console.error('Bulk create failed for', item.payload, err);
                fallidas.push(item);
            }
        }

        const enviadas = queue.length - fallidas.length;
        setQueue(fallidas);
        setSending(false);

        if (fallidas.length === 0) {
            showAlert('success', `${enviadas} registros creados`);
            setViewMode('TABLE');
            fetchData();
        } else {
            // Las que fallaron se quedan en la lista para reintentarlas. Decir «hecho»
            // cuando tres de cinco han entrado sería mentir, y encima sin dejar
            // manera de saber cuáles.
            showAlert('error', `${enviadas} creados, ${fallidas.length} con error. Los que fallaron siguen en la lista.`);
            fetchData();
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (viewMode === 'BULK') {
        return (
            <Card
                title={<Space><UnorderedListOutlined />Crear en tanda</Space>}
                className="border-0 shadow-sm"
                extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Rellena, añade a la lista y repite. Al final se envía todo.
                    </Text>
                }
            >
                {/* Formulario a la izquierda, cola a la derecha. En móvil se apila,
                    con la cola debajo: ahí no hay sitio para dos columnas. */}
                <Row gutter={[20, 20]}>
                    <Col xs={24} lg={14}>
                        <BasicForm
                            fields={fields}
                            names={names}
                            table={table}
                            selectData={selectData}
                            maxTagCount={maxTagCount}
                            onCancel={() => { setQueue([]); setViewMode('TABLE'); }}
                            onCollect={(payload) => setQueue(prev => [...prev, { id: Date.now() + Math.random(), payload }])}
                        />
                    </Col>

                    <Col xs={24} lg={10}>
                        <div
                            style={{
                                border: '1px solid rgba(var(--tint), 0.08)',
                                borderRadius: 10,
                                padding: '14px 16px',
                                background: 'rgba(var(--tint), 0.015)',
                            }}
                        >
                            <Flex justify="space-between" align="center" gap={10} style={{ marginBottom: 12 }}>
                                <Text strong style={{ fontSize: 13 }}>
                                    En la lista{queue.length > 0 ? ` (${queue.length})` : ''}
                                </Text>
                                <Space size={6}>
                                    <Button
                                        size="small"
                                        disabled={queue.length === 0 || sending}
                                        onClick={() => setQueue([])}
                                    >
                                        Vaciar
                                    </Button>
                                    <Button
                                        type="primary"
                                        size="small"
                                        icon={<SendOutlined />}
                                        loading={sending}
                                        disabled={queue.length === 0}
                                        onClick={sendQueue}
                                    >
                                        Enviar {queue.length > 0 ? queue.length : ''}
                                    </Button>
                                </Space>
                            </Flex>

                            {queue.length === 0 ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={<Text type="secondary" style={{ fontSize: 12 }}>Todavía no has añadido nada</Text>}
                                    style={{ margin: '18px 0' }}
                                />
                            ) : (
                                // Con tope de altura: una tanda larga no debe estirar
                                // la página y dejar el formulario fuera de pantalla.
                                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                                    <List
                                        size="small"
                                        dataSource={queue}
                                        renderItem={(item, i) => (
                                            <List.Item
                                                style={{ paddingLeft: 0, paddingRight: 0 }}
                                                actions={[
                                                    <Button
                                                        key="del"
                                                        type="text"
                                                        size="small"
                                                        danger
                                                        disabled={sending}
                                                        icon={<CloseOutlined />}
                                                        onClick={() => setQueue(prev => prev.filter(q => q.id !== item.id))}
                                                    />
                                                ]}
                                            >
                                                <Space size={8} style={{ minWidth: 0 }}>
                                                    <Tag style={{ margin: 0 }}>{i + 1}</Tag>
                                                    <Text style={{ fontSize: 12.5 }}>{summarize(item.payload)}</Text>
                                                </Space>
                                            </List.Item>
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>
            </Card>
        );
    }

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
                    <Space>
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
                        <Button
                            icon={<UnorderedListOutlined />}
                            onClick={async () => {
                                setLoading(true);
                                await loadRelations();
                                setRecordToProcess(null);
                                setQueue([]);
                                setViewMode('BULK');
                                setLoading(false);
                            }}
                        >
                            Crear en tanda
                        </Button>
                    </Space>
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
