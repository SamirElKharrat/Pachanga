import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Upload, DatePicker, Switch, Space, Typography, Divider } from 'antd';
import { PlusOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Card } from 'antd';
import { showAlert } from './AlertInfo';
import { API } from '../../services/api';

const { Text } = Typography;
const { TextArea } = Input;

// Static options for selects
const FORMAT_OPTIONS  = [{ value: 'BO1', label: 'BO1' }, { value: 'BO3', label: 'BO3' }, { value: 'BO5', label: 'BO5' }];
const STATUS_OPTIONS  = [{ value: 'scheduled', label: 'Programado' }, { value: 'live', label: 'En vivo' }, { value: 'finished', label: 'Finalizado' }];
const TYPE_OPTIONS    = [{ value: 'question', label: 'Pregunta' }, { value: 'score', label: 'Puntuación' }];

// Result options per match format
const RESULT_OPTIONS = {
    BO1: [{ value: '1-0', label: '1-0' }],
    BO3: [{ value: '2-0', label: '2-0' }, { value: '2-1', label: '2-1' }],
    BO5: [{ value: '3-0', label: '3-0' }, { value: '3-1', label: '3-1' }, { value: '3-2', label: '3-2' }],
};

/**
 * Helper to parse dates that might come formatted as "DD-MM-YYYY HH:mm"
 * back into ISO format for dayjs to read safely.
 */
const parseFriendlyDate = (dateStr) => {
    if (!dateStr) return null;
    const regex = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/;
    const match = dateStr.match(regex);
    if (match) {
        const [, day, month, year, hour, minute] = match;
        return `${year}-${month}-${day}T${hour}:${minute}:00`;
    }
    return dateStr;
};

/**
 * A dynamic form for admin CRUD operations.
 */
const BasicForm = ({ fields, names, record, onCancel, onSuccess, table, maxTagCount, selectData }) => {
    const [form]           = Form.useForm();
    const [fileList, setFileList]           = useState([]);
    const [relationData, setRelationData]   = useState([]);
    const [loading, setLoading]             = useState(false);
    const [selectedFormat, setSelectedFormat] = useState(null); // for result_select

    // ── Pre-fill form when editing ────────────────────────────────────────────
    useEffect(() => {
        if (record) {
            const formattedRecord = { ...record[0] };
            Object.keys(formattedRecord).forEach(key => {
                if (key.endsWith('_date') || key.includes('date')) {
                    const parsed = parseFriendlyDate(formattedRecord[key]);
                    formattedRecord[key] = parsed ? dayjs(parsed) : null;
                }

                // Format string URLs for file uploads (e.g. logo_url) into the array format required by AntD Upload
                const fieldIndex = names.indexOf(key);
                if (fieldIndex !== -1 && fields[fieldIndex] === 'file' && typeof formattedRecord[key] === 'string' && formattedRecord[key]) {
                    const url = formattedRecord[key];
                    formattedRecord[key] = [{
                        uid: '-1',
                        name: url.substring(url.lastIndexOf('/') + 1) || 'logo',
                        status: 'done',
                        url: url
                    }];
                }
            });
            form.setFieldsValue(formattedRecord);
        }
    }, [record, form, names, fields]);

    const normFile = (e) => (Array.isArray(e) ? e : e?.fileList);

    // ── Handle dynamic dependent selects ─────────────────────────────────────
    const handleSelect = async (option) => {
        const url = option.name === 'match_id' ? '/matches/getTeams' : '/leagues/getTeams';
        try {
            const response = await API.get(`${url}/${option.value}`);
            setRelationData(response.Teams || []);

            if (option.name === 'match_id') {
                const matchRes = await API.get(`/matches/get/${option.value}`);
                const fmt = matchRes[0]?.format || matchRes?.format || 'BO1';
                setSelectedFormat(fmt);
                // Clear result field when match changes
                form.setFieldValue('result', undefined);
            }
        } catch {
            showAlert('error', 'Error al cargar datos relacionados');
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const onFinish = async (values) => {
        setLoading(true);
        try {
            const endpoint = record
                ? `/${table}/update/${record[0].id}`
                : (table === 'users' ? `/${table}/register` : `/${table}/set`);

            // File upload
            if (values.logo_url?.length > 0) {
                if (record && values.logo_url[0].url === record[0].logo_url) {
                    values.logo_url = record[0].logo_url;
                } else {
                    const formData = new FormData();
                    formData.append('file', values.logo_url[0].originFileObj);
                    const response = await API.post('/upload/', formData);
                    values.logo_url = response.url;
                }
            }

            // Date formatting
            if (values.date)       values.date       = dayjs(values.date).format('YYYY-MM-DDTHH:mm:ss');
            if (values.start_date) values.start_date = dayjs(values.start_date).format('YYYY-MM-DDTHH:mm:ss');
            if (values.end_date)   values.end_date   = dayjs(values.end_date).format('YYYY-MM-DDTHH:mm:ss');

            // leagues → league_id
            if (values.leagues) { values.league_id = values.leagues; delete values.leagues; }

            // roles → role (backend reads req.body.role)
            if (values.roles) { values.role = values.roles; delete values.roles; }

            // Predictions need current user
            if (table === 'predictions') {
                const user = await API.getUserByToken();
                values.user_id = user.id;
            }

            if (record) {
                const updatedValues = Object.fromEntries(
                    Object.entries(values).filter(([, v]) => v !== undefined)
                );
                await API.put(endpoint, updatedValues);
                showAlert('success', 'Actualizado correctamente');
            } else {
                await API.post(endpoint, values);
                showAlert('success', 'Creado correctamente');
            }

            onSuccess?.();
            onCancel?.();
        } catch (error) {
            console.error('Form submission error:', error);
            showAlert('error', 'Hubo un problema al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    // ── Dynamic field renderer ────────────────────────────────────────────────
    const renderFormItem = (field, index) => {
        const name  = names[index];
        const label = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const commonProps = {
            key: name, name, label,
            rules: !record ? [{ required: true, message: `${label} es obligatorio` }] : [],
        };

        switch (field) {
            case 'text':
                return (
                    <Form.Item {...commonProps}>
                        <Input placeholder={`Ingresar ${label.toLowerCase()}`} style={{ maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'password':
                return (
                    <Form.Item {...commonProps}>
                        <Input.Password placeholder="Ingresar nueva contraseña" style={{ maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'boolean':
                return (
                    <Form.Item {...commonProps} valuePropName="checked">
                        <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                    </Form.Item>
                );

            case 'number':
                return (
                    <Form.Item {...commonProps}>
                        <Input type="number" placeholder={`Ingresar ${label.toLowerCase()}`} style={{ maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'date':
                return (
                    <Form.Item {...commonProps}>
                        <DatePicker showTime format="DD-MM-YYYY HH:mm" style={{ width: '100%', maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'textarea':
                return (
                    <Form.Item {...commonProps}>
                        <TextArea rows={4} placeholder={`Ingresar ${label.toLowerCase()}`} style={{ maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'file':
                return (
                    <Form.Item {...commonProps} valuePropName="fileList" getValueFromEvent={normFile}>
                        <Upload listType="picture-card" maxCount={1} beforeUpload={() => false} accept="image/*">
                            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues[name] !== currentValues[name]}>
                                {({ getFieldValue }) => {
                                    const list = getFieldValue(name) || [];
                                    return list.length < 1 ? (
                                        <div><PlusOutlined /><div style={{ marginTop: 8 }}>Subir</div></div>
                                    ) : null;
                                }}
                            </Form.Item>
                        </Upload>
                    </Form.Item>
                );

            case 'select': {
                let options = [];
                if (name === 'format')   options = FORMAT_OPTIONS;
                else if (name === 'status') options = STATUS_OPTIONS;
                else if (name === 'type')   options = TYPE_OPTIONS;
                else if (name === 'winner') options = relationData.map(t => ({ value: t.id ?? t.value, label: t.name ?? t.label }));
                else {
                    const relName = name === 'match_id' ? 'matches' : (name === 'leagues' ? 'leagues' : name);
                    const matchData = selectData.find(d => d.name === relName);
                    if (matchData) options = matchData.data;
                }

                return (
                    <Form.Item {...commonProps}>
                        <Select
                            placeholder={`Seleccionar ${label.toLowerCase()}`}
                            onSelect={(val) => handleSelect({ value: val, name })}
                            options={options}
                            showSearch
                            optionFilterProp="label"
                            style={{ width: '100%', maxWidth: 400 }}
                        />
                    </Form.Item>
                );
            }

            case 'multiselect':
                return (
                    <Form.Item {...commonProps}>
                        <Select
                            mode="multiple"
                            placeholder={`Seleccionar ${label.toLowerCase()}`}
                            maxCount={maxTagCount > 0 ? maxTagCount : undefined}
                            options={
                                name === 'teams' && relationData.length > 0
                                    ? relationData.map(t => ({ value: t.id ?? t.value, label: t.name ?? t.label }))
                                    : (selectData.find(d => d.name === name)?.data || [])
                            }
                            style={{ width: '100%', maxWidth: 400 }}
                        />
                    </Form.Item>
                );

            // ── NEW: Smart result select based on match format ────────────────
            case 'result_select': {
                const resultOptions = RESULT_OPTIONS[selectedFormat] || [];
                return (
                    <Form.Item
                        {...commonProps}
                        help={!selectedFormat ? 'Selecciona un partido primero para ver las opciones' : undefined}
                    >
                        <Select
                            placeholder={selectedFormat ? `Resultado (${selectedFormat})` : 'Selecciona un partido primero'}
                            options={resultOptions}
                            disabled={!selectedFormat || resultOptions.length === 0}
                            style={{ width: '100%', maxWidth: 400 }}
                        />
                    </Form.Item>
                );
            }

            default:
                return null;
        }
    };

    return (
        <Card className="border-0 bg-transparent" styles={{ body: { padding: 0 } }}>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                {fields.map((field, index) => renderFormItem(field, index))}

                <Divider className="my-4" />

                <Space className="w-100 justify-content-end">
                    <Button onClick={onCancel} icon={<CloseOutlined />}>Cancelar</Button>
                    <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                        {record ? 'Actualizar' : 'Guardar'}
                    </Button>
                </Space>
            </Form>
        </Card>
    );
};

export default BasicForm;
