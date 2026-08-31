import React, { useState, useEffect, useCallback } from 'react';
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
// Qué clase de cambio es una línea de las novedades. Se llama `kind` y no `type`
// porque `type` ya está cogido por el de las predicciones, justo aquí arriba.
const KIND_OPTIONS    = [
    { value: 'new', label: 'Nuevo' },
    { value: 'change', label: 'Cambio' },
    { value: 'fix', label: 'Arreglo' },
];
// La piel que lleva la web mientras la liga esté viva. Se marca una vez al crearla.
const THEME_OPTIONS   = [{ value: 'default', label: 'Normal' }, { value: 'worlds', label: 'Worlds — mundial' }];

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
const BasicForm = ({ fields, names, record, onCancel, onSuccess, table, maxTagCount, selectData, onCollect }) => {
    const [form]           = Form.useForm();
    const [fileList, setFileList]           = useState([]);
    const [relationData, setRelationData]   = useState([]);
    const [loading, setLoading]             = useState(false);
    const [selectedFormat, setSelectedFormat] = useState(null); // for result_select

    // ── Handle dynamic dependent selects ─────────────────────────────────────
    const handleSelect = useCallback(async (option) => {
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
    }, [form]);

    // ── Pre-fill form when editing / default values ────────────────────────────
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
            if (table === 'matches' && formattedRecord.league_id) {
                handleSelect({ value: formattedRecord.league_id, name: 'leagues' });
            }
        } else {
            if (table === 'matches' && selectData?.length > 0) {
                const leagueData = selectData.find(d => d.name === 'leagues');
                if (leagueData && leagueData.data?.length > 0) {
                    const newestLeagueId = leagueData.data[0].value;
                    form.setFieldValue('leagues', newestLeagueId);
                    handleSelect({ value: newestLeagueId, name: 'leagues' });
                }
            }
        }
    }, [record, form, names, fields, selectData, table, handleSelect]);

    const normFile = (e) => (Array.isArray(e) ? e : e?.fileList);

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

            // Un `option_select` que se vacía a propósito tiene que llegar como null
            // y no perderse en el filtro de undefined de abajo: vaciar la respuesta
            // correcta de una pregunta es lo que la descorrige y devuelve sus puntos.
            // Antd deja en undefined lo que se borra, y undefined ahí significaría
            // «no lo toques».
            fields.forEach((f, i) => {
                if (f === 'option_select' && values[names[i]] === undefined) {
                    values[names[i]] = null;
                }
            });

            // Predictions need current user
            if (table === 'predictions') {
                const user = await API.getUserByToken();
                values.user_id = user.id;
            }

            // Modo masivo: en vez de enviar, se entrega arriba y el formulario se
            // queda como está. Que NO se vacíe es deliberado: metiendo los cinco
            // partidos de una jornada, la liga y el formato se repiten y lo único que
            // cambia son los equipos y la hora.
            if (onCollect) {
                onCollect(values);

                // Los campos de fichero SÍ se vacían. Un logo no se repite entre dos
                // registros, y dejarlo puesto haría que el siguiente subiera otra vez
                // la misma imagen y acabara con una copia suya. El resto se queda.
                fields.forEach((f, i) => {
                    if (f === 'file') form.setFieldValue(names[i], undefined);
                });

                showAlert('success', 'Añadido a la lista');
                return;
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
        // OJO: `key` NO va aquí. React lo trata aparte del resto de props y avisa por
        // consola en cuanto se le cuela dentro de un spread; cada `return` lo pone
        // explícito.
        const commonProps = {
            name, label,
            rules: !record ? [{ required: true, message: `${label} es obligatorio` }] : [],
        };

        switch (field) {
            case 'text':
                return (
                    <Form.Item key={name} {...commonProps}>
                        <Input placeholder={`Ingresar ${label.toLowerCase()}`} style={{ maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'password':
                return (
                    <Form.Item key={name} {...commonProps}>
                        <Input.Password placeholder="Ingresar nueva contraseña" style={{ maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'boolean':
                return (
                    <Form.Item key={name} {...commonProps} valuePropName="checked">
                        <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                    </Form.Item>
                );

            case 'number':
                return (
                    <Form.Item key={name} {...commonProps}>
                        <Input type="number" placeholder={`Ingresar ${label.toLowerCase()}`} style={{ maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'date':
                return (
                    <Form.Item key={name} {...commonProps}>
                        <DatePicker showTime format="DD-MM-YYYY HH:mm" style={{ width: '100%', maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'textarea':
                return (
                    <Form.Item key={name} {...commonProps}>
                        <TextArea rows={4} placeholder={`Ingresar ${label.toLowerCase()}`} style={{ maxWidth: 400 }} />
                    </Form.Item>
                );

            case 'file':
                return (
                    <Form.Item key={name} {...commonProps} valuePropName="fileList" getValueFromEvent={normFile}>
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
                else if (name === 'kind')   options = KIND_OPTIONS;
                else if (name === 'theme')  options = THEME_OPTIONS;
                else if (name === 'winner') options = relationData.map(t => ({ value: t.id ?? t.value, label: t.name ?? t.label }));
                else {
                    const relName = name === 'match_id' ? 'matches' : (name === 'leagues' ? 'leagues' : name);
                    const matchData = selectData.find(d => d.name === relName);
                    if (matchData) options = matchData.data;
                }

                return (
                    <Form.Item key={name} {...commonProps}>
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
                    <Form.Item key={name} {...commonProps}>
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

            // ── Lista de textos libre: las opciones de una pregunta ───────────
            // `mode="tags"` deja escribir valores que no están en ninguna lista, que
            // es justo lo que hace falta: las opciones se inventan al escribir la
            // pregunta. El valor es un array de textos y va tal cual al JSONB.
            case 'taglist':
                return (
                    <Form.Item key={name} {...commonProps} help="Escribe cada opción y pulsa Enter">
                        <Select
                            mode="tags"
                            open={false}
                            placeholder="Sí, No, G2…"
                            tokenSeparators={[',']}
                            style={{ width: '100%', maxWidth: 400 }}
                        />
                    </Form.Item>
                );

            // ── Elegir entre las opciones de este mismo formulario ────────────
            // Mismo patrón que `result_select`, pero sin ir al servidor: las opciones
            // están en otro campo del formulario, así que basta con volver a pintar
            // cuando ese campo cambie.
            //
            // Nunca es obligatorio: la pregunta se crea sin corregir y se corrige
            // días después.
            case 'option_select':
                return (
                    <Form.Item key={name} noStyle shouldUpdate={(prev, cur) => prev.options !== cur.options}>
                        {({ getFieldValue }) => {
                            const opts = getFieldValue('options') || [];
                            // Sin `key`: esto no sale de una lista, sale del render-prop
                            // del Form.Item de fuera, que ya la lleva.
                            return (
                                <Form.Item
                                    {...commonProps}
                                    rules={[]}
                                    help={opts.length ? 'Se deja en blanco hasta que acabe la jornada' : 'Escribe antes las opciones'}
                                >
                                    <Select
                                        allowClear
                                        placeholder="Sin corregir"
                                        disabled={opts.length === 0}
                                        options={opts.map(o => ({ value: o, label: o }))}
                                        style={{ width: '100%', maxWidth: 400 }}
                                    />
                                </Form.Item>
                            );
                        }}
                    </Form.Item>
                );

            // ── NEW: Smart result select based on match format ────────────────
            case 'result_select': {
                const resultOptions = RESULT_OPTIONS[selectedFormat] || [];
                return (
                    <Form.Item
                        key={name}
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
                    <Button type="primary" htmlType="submit" loading={loading} icon={onCollect ? <PlusOutlined /> : <SaveOutlined />}>
                        {onCollect ? 'Añadir a la lista' : (record ? 'Actualizar' : 'Guardar')}
                    </Button>
                </Space>
            </Form>
        </Card>
    );
};

export default BasicForm;
