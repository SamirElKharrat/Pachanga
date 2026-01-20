import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../../services/api';
import { Table, Button, Space, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons';
import Search from 'antd/es/input/Search';
import ModalInfo from './ModalInfo';
import BasicForm from './BasicForm';
import { useNavigate } from 'react-router-dom';
import { showAlert } from './AlertInfo';

import dayjs from 'dayjs';


const AdminPanel = ({ table, names, fields, relation }) => {
    const [data, setData] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [openModal, setOpenModal] = useState(false);
    const [filteredData, setFilteredData] = useState([]);
    const [record, setRecord] = useState(null);
    const [selectData, setSelectData] = useState([]);
    const nav = useNavigate();
    const [maxTagCount, setMaxTagCount] = useState(0);
    const fetchData = useCallback(async () => {
        try {
            const response = await API.get(`/${table}/get`);

            const filterResponse = (item) => Object.fromEntries(
                Object.entries(item).map(([key, value]) => {
                    if (key.endsWith('_date') || key.includes('date')) {
                        // Si el valor ya esta en el formato correcto, usarlo directamente
                        if (typeof value === 'string' && value.match(/\d{2}-\d{2}-\d{4} \d{2}:\d{2}/)) {
                            return [key, value];
                        }
                        // Convertir a dayjs y formatear
                        const dayjsDate = dayjs(value);
                        return [key, dayjsDate];
                    }
                    if (typeof value === 'object' && value !== null) {
                        return null;
                    }
                    return [key, value];
                }).filter(Boolean)
            );

            setFilteredData(response.map(filterResponse));
            setData(response.map(filterResponse));
        } catch (err) {
            showAlert('error', `Error fetching ${table}: ${err.message}`);
            setData([]);
        }
    }, [table, setFilteredData, setData]);

    useEffect(() => {
        fetchData();
        if (table === 'matches') {
            setMaxTagCount(2);
        }
    }, [table, fetchData]);

    //Funcion que recoge los datos de las relations para poblar los select en los formularios
    const relationData = async (method) => {
        if (!relation) return;

        const dataMap = {};

        // Fetch data for each relation
        for (const item of relation) {
            try {
                if(item == "matches"){
                    const response = await API.get(`/matches/getWithoutResult`);
                    const processedData = response.map(item => ({
                        value: item.id,
                        label: item.name
                    }));
                    dataMap[item] = processedData;
                }
                else{
                    const response = await API.get(`/${item}/get`);
                    const processedData = response.map(item => ({
                        value: item.id,
                        label: item.name
                    }));
                    dataMap[item] = processedData;
                }
            } catch (err) {
                showAlert('error', `Error fetching ${item}: ${err.message}`);
            }
        }

        // Create namesMap with names that match relation values
        fields
            .map((field, index) => {
                if (field === 'select' || field === 'multiselect') {
                    const relationName = names[index];
                    return relation.includes(relationName) ? relationName : null;
                }
                return null;
            })
            .filter(Boolean);


        // Create finalData with matching relation names
        const finalData = Object.entries(dataMap).map(([relationName, data]) => ({
            name: relationName,
            data
        }));
        console.log(finalData)
        if (method === 'POST' || method === 'PUT') {
            setSelectData(finalData);
        }
        return finalData;
    };

    // Generador de las columnas con las key de los objetos
    const generateColumns = () => {
        if (!data || data.length === 0) return [];

        const firstItem = data[0];
        const dataColumns = Object.keys(firstItem).map(key => ({
            title: key
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            dataIndex: key,
            key: key,
            width: key === 'logo_url' ? 80 : 150, // Asigna ancho fijo
            render: (text) => {
                if (key === 'logo_url' && text) {
                    const url = Array.isArray(text) ? text[0]?.url : text;
                    return (
                        <img
                            src={url}
                            alt="logo"
                            style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 4 }}
                        />
                    );
                }
                return text?.toString() || '-';
            }
        }));

        // Columna de acciones
        const actionsColumn = {
            title: 'Acciones',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                            const recordToEdit = { ...record };
                            if (recordToEdit.logo_url) {
                                recordToEdit.logo_url = [
                                    {
                                        uid: '-1',
                                        name: recordToEdit.logo_url.split('/').pop(),
                                        status: 'done',
                                        url: recordToEdit.logo_url
                                    }
                                ];
                            }
                            setRecord([recordToEdit]);
                            setMethod('PUT');
                            relationData('PUT');
                        }}
                    />
                    <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            setOpenModal(true);
                            setRecord(record);
                        }}
                        title="Eliminar"
                    />
                    {table == "users" ? 
                    <Button
                        type="text"
                        icon={<UndoOutlined/>}
                        onClick={async () => {
                            await API.put(`/users/resetPassword/${record.id}`);
                            localStorage.removeItem('token');
                            nav('/login');
                        }}
                        title="Reestablecer contraseña"
                    /> : ""}
                </Space>
            ),
        };

        return [...dataColumns, actionsColumn];
    };

    // Configuración de la paginación
    const pagination = {
        pageSize: 5,
    };

    // Función para manejar la búsqueda
    const handleSearch = (value) => {
        setSearchText(value);
        if (!value) {
            setFilteredData(data);
            return;
        }
        const filtered = data.filter(item =>
            Object.values(item).some(
                val => val && val.toString().toLowerCase().includes(value.toLowerCase())
            )
        );
        setFilteredData(filtered);
    };

    const [method, setMethod] = useState('GET');

    const renderContent = () => {
        switch (method) {
            case 'POST':
                return (
                    <BasicForm
                        fields={fields}
                        names={names}
                        method="post"
                        record={null}
                        table={table}
                        selectData={selectData}
                        maxTagCount={maxTagCount}
                        onCancel={() => {
                            setMethod('GET');
                        }}
                        onSuccess={() => {
                            setMethod('GET');
                            fetchData();
                            nav('/admin')
                        }}
                    />
                );
            case 'PUT':
                return (
                    <BasicForm
                        fields={fields}
                        names={names}
                        method="put"
                        record={record}
                        table={table}
                        selectData={selectData}
                        maxTagCount={maxTagCount}
                        onCancel={() => {
                            setMethod('GET');
                            setRecord(null);
                        }}
                        onSuccess={() => {
                            setMethod('GET');
                            setRecord(null);
                            fetchData();
                            nav('/admin')
                        }}
                    />
                );
            default:
                return (
                    <div style={{ padding: '16px' }}>
                        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                            <Col xs={24} md={12}>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        setRecord(null);
                                        relationData('POST');
                                        setMethod('POST');
                                    }}
                                >
                                    Crear nuevo
                                </Button>
                            </Col>
                            <Col xs={24} md={7} style={{ textAlign: 'right' }}>
                                <Search
                                    placeholder={`Buscar en ${table}...`}
                                    allowClear
                                    enterButton={
                                        <Button type="primary" icon={<SearchOutlined />} />
                                    }
                                    size="large"
                                    value={searchText}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    onSearch={handleSearch}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                        </Row>
                        <Table
                            rowKey="id"
                            dataSource={filteredData}
                            columns={generateColumns()}
                            pagination={{
                                ...pagination,
                                position: ['bottomCenter'],
                                showSizeChanger: false,
                            }}
                            size="middle"
                            scroll={{ x: 'max-content' }}
                            className="custom-admin-table"
                            locale={{
                                emptyText: 'No se encontraron resultados.',
                            }}
                        />

                        <ModalInfo
                            open={openModal}
                            title="Eliminar"
                            description="¿Estás seguro de eliminar este registro?"
                            okText="Eliminar"
                            cancelText="Cancelar"
                            onSuccess={() => {
                                API.delete(`/${table}/delete/${record.id}`)
                                    .then(() => {
                                        setOpenModal(false);
                                        setData(data.filter(item => item.id !== record.id));
                                        setFilteredData(filteredData.filter(item => item.id !== record.id));
                                        nav('/admin')
                                        showAlert('success', `Registro eliminado correctamente`);
                                    })
                                    .catch((err) => {
                                        console.error(`Error deleting ${table}:`, err);
                                        showAlert('error', `Error deleting ${table}: ${err.message}`);
                                    });
                            }}
                            onClose={() => {
                                setOpenModal(false);
                            }}
                        />
                    </div>
                );
        }
    };

    return (
        <>
            {renderContent()}
        </>
    );
};

export default AdminPanel;
