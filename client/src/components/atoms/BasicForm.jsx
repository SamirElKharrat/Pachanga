import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Upload, DatePicker, Switch, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { showAlert } from './AlertInfo';
import { API } from '../../services/api';

const format = [{ value: 'BO1', label: 'BO1' }, { value: 'BO3', label: 'BO3' }, { value: 'BO5', label: 'BO5' }]
const status = [{ value: 'scheduled', label: 'Programado' }, { value: 'live', label: 'En vivo' }, { value: 'finished', label: 'Finalizado' }]
const type = [{ value: 'question', label: 'Pregunta' }, { value: 'score', label: 'Puntuación' }]


const BasicForm = ({ fields, names, record, onCancel, onSuccess, table, maxTagCount, selectData }) => {

    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const [relationData, setRelationData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (record) {
            const formattedRecord = { ...record[0] };
            Object.keys(formattedRecord).forEach(key => {
                if (key.endsWith('_date') || key.includes('date')) {
                    formattedRecord[key] = formattedRecord[key] ? dayjs(formattedRecord[key], "YYYY-MM-DDTHH:mm:ss") : null;
                }
            });

            form.setFieldsValue(formattedRecord);
        }
    }, [record, form]);


    const normFile = (e) => {
        return e?.fileList;
    };

    const handleSelect = (option) => {
        const url = option.name == "match_id" ? "/matches/getTeams" : "/leagues/getTeams";
        API.get(`${url}/${option.value}`)
            .then((response) => {
                setRelationData(response.Teams)
            })
            .catch((error) => {
                showAlert('error', error.message);
            });
    }

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const endpoint = record ? record[0] ? `/${table}/update/${record[0].id}` : table === 'users' ? `/${table}/register` : `/${table}/set` : `/${table}/set`;
            if (values.logo_url && values.logo_url.length > 0) {
                if (record && JSON.stringify(values.logo_url) == JSON.stringify(record[0].logo_url)) {
                    values.logo_url = record[0].logo_url.url;
                }
                else {
                    const formData = new FormData();
                    formData.append('file', values.logo_url[0].originFileObj);
                    try {
                        const response = await API.post(`/upload/`, formData);
                        values.logo_url = response.url;
                    } catch (error) {
                        showAlert('error', error.message);
                        return;
                    }
                }
            }



            if (values.date) {
                values.date = dayjs(values.date).format('YYYY-MM-DDTHH:mm:ss');
            }
            if (Object.keys(values).includes('leagues')) {
                values.league_id = values.leagues;
                delete values.leagues;
            }
            if (table == "predictions") {
                try {
                    const response = await API.getUserByToken();
                    values.user_id = response.id;
                } catch (error) {
                    showAlert('error', error.message);
                    return;
                }
            }

            if (record) {
                //Solo tener las keys que tienen data 
                const updatedValues = Object.fromEntries(
                    Object.entries(values).filter(([, value]) => value !== undefined)
                );
                await API.put(endpoint, updatedValues)
                    .then(() => {
                        onCancel?.();
                        if (onSuccess) {
                            onSuccess();
                            showAlert('success', 'Actualizado correctamente');
                        }
                    })
                    .catch(() => {
                        showAlert('error', "Error al Actualizar");
                    });
            } else {
                console.log(values)
                await API.post(endpoint, values)
                    .then(() => {
                        onCancel?.();
                        if (onSuccess) {
                            onSuccess();
                            showAlert('success', 'Guardado correctamente');
                        }
                    })
                    .catch(() => {
                        showAlert('error', "Error al Crear");
                    });
            }
        } catch (error) {
            showAlert('error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderFormItem = (field, index) => {
        const values = record ? Object.values(record[0]).slice(1) : [];
        // Solo requerir validación cuando se está creando (no hay record)
        const rules = !record
            ? [{ required: true, message: `Por favor ingrese ${names[index].toLowerCase()}` }]
            : [];

        const commonProps = {
            key: `${names[index]}-${index}`,
            name: names[index],
            label: names[index].charAt(0).toUpperCase() + names[index].slice(1),
            rules: rules
        };

        switch (field) {
            case 'text':
                return (
                    <Form.Item {...commonProps}>
                        <Input
                            placeholder={`Ingrese ${names[index].toLowerCase()}`}
                            defaultValue={values[index]}
                        />
                    </Form.Item>
                );
            case 'password':
                return (
                    <Form.Item {...commonProps}>
                        <Input.Password placeholder={`Ingrese su nueva contraseña`} />
                    </Form.Item>
                );
            case 'boolean':
                return (
                    <Form.Item {...commonProps} valuePropName="checked">
                        <Switch checkedChildren="Sí" unCheckedChildren="No" defaultValue={values[index]} />
                    </Form.Item>
                );
            case 'number':
                return (
                    <Form.Item {...commonProps}>
                        <Input
                            type="number"
                            placeholder={`Ingrese ${names[index].toLowerCase()}`}
                            value={values[index]}
                            onChange={(e) => form.setFieldsValue({ [names[index]]: e.target.value ? Number(e.target.value) : null })}
                        />
                    </Form.Item>
                );
            case 'date':
                return (
                    <Form.Item {...commonProps}>
                        <DatePicker
                            className="custom-dark-datepicker"
                            style={{ width: '100%' }}
                            showTime
                            format="DD-MM-YYYY HH:mm"
                            defaultValue={values[index]}
                        />
                    </Form.Item>
                );
            case 'textarea':
                return (
                    <Form.Item {...commonProps}>
                        <TextArea
                            rows={4}
                            placeholder={`Ingrese ${names[index].toLowerCase()}`}
                            defaultValue={values[index]}
                        />
                    </Form.Item>
                );
            case 'file':
                return (
                    <Form.Item
                        {...commonProps}
                        valuePropName="fileList"
                        getValueFromEvent={normFile}
                        rules={[{ required: false }]}
                    >
                        <Upload
                            listType="picture-card"
                            fileList={fileList}
                            onChange={({ fileList }) => setFileList(fileList)}
                            beforeUpload={(file) => {
                                const isImage = file.type.startsWith('image/');
                                if (!isImage) {
                                    message.error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, etc.)');
                                    return Upload.LIST_IGNORE;
                                }
                                return false;
                            }}

                            accept="image/*"
                            maxCount={1}
                        >

                            {fileList.length === 1 ? null : (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>Subir</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>
                );
            case 'select':
                return (
                    <Form.Item {...commonProps}>
                        <Select
                            placeholder={`Seleccione ${names[index].toLowerCase()}`}
                            onSelect={(value) => handleSelect({ value: value, name: names[index] })}
                            options={selectData.map((data) => {
                                if (data.name === names[index]) {
                                    return data.data;
                                }
                                else if (names[index] === 'format') {
                                    return format;
                                }
                                else if (names[index] === 'status') {
                                    return status;
                                }
                                else if (names[index] === 'type') {
                                    return type;
                                }
                                else if (relationData.length > 0 && names[index] === 'winner') {
                                    return relationData;
                                }
                                else if (names[index] === 'match_id') {
                                    return data.data;
                                }
                            })[0]}
                        />
                    </Form.Item>
                );
            case 'multiselect':
                return (
                    <Form.Item {...commonProps}>
                        <Select
                            mode="multiple"
                            placeholder={`Seleccione ${names[index].toLowerCase()}`}
                            maxCount={maxTagCount ? maxTagCount : 1000}
                            options={
                                names[index] === 'teams' && relationData.length > 0
                                    ? relationData
                                    : selectData.map((data) => {
                                        if (data.name === names[index]) {
                                            return data.data;
                                        }
                                    })[0]
                            }
                        />
                    </Form.Item>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ maxWidth: 300 }}>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={record ? record[0] : {}}
            >
                {fields.map((field, index) => renderFormItem(field, index))}

                <Form.Item style={{ marginTop: 16, textAlign: 'left' }}>
                    <Button onClick={onCancel} type='info' style={{ marginRight: 8 }}>
                        Cancelar
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        {record ? 'Actualizar' : 'Guardar'}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default BasicForm;
