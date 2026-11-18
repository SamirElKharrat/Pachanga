import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Typography } from 'antd';
import { API } from '../../services/api';
import { showAlert } from './AlertInfo';
import CoinHistory from './CoinHistory';
import { refreshCoins } from '../../hooks/useCoins';

const { Text } = Typography;

/**
 * Pachanguitas en el panel de admin: elegir un jugador, ver su saldo y su historial, y
 * darle o quitarle pachanguitas a mano.
 *
 * Un ajuste siempre lleva motivo, porque el jugador lo ve en su historial. El
 * servidor lo recorta al techo (al dar) o a 0 (al quitar), y aquí se avisa si lo hizo.
 */
export default function CoinsAdmin() {
    const [form] = Form.useForm();
    const [users, setUsers] = useState([]);
    const [userId, setUserId] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        API.get('/users/get')
            .then(list => setUsers(Array.isArray(list) ? list : []))
            .catch(() => showAlert('error', 'No se pudieron cargar los usuarios'));
    }, []);

    const loadWallet = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        try {
            setWallet(await API.get(`/coins/user/${id}`));
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo cargar el historial');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadWallet(userId); }, [userId, loadWallet]);

    const submit = async ({ amount, note }) => {
        setSaving(true);
        try {
            const r = await API.post('/coins/grant', { user_id: userId, amount, note });
            if (r.applied !== r.requested) {
                showAlert('warning', `Se han movido ${r.applied} de ${r.requested}: ${r.requested > 0 ? 'el jugador llegaba al máximo' : 'no tenía tantas'}`);
            } else {
                showAlert('success', `${r.applied > 0 ? '+' : ''}${r.applied} pachanguitas. Saldo: ${r.balance}`);
            }
            form.resetFields();
            await loadWallet(userId);
            // Si el ajuste es al propio admin, su menú también tiene que enterarse.
            refreshCoins();
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo hacer el ajuste');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} lg={10}>
                <Card size="small" title="Ajustar pachanguitas">
                    <Form form={form} layout="vertical" onFinish={submit} disabled={!userId}>
                        <Form.Item label="Jugador" required>
                            <Select
                                placeholder="Elige un jugador"
                                showSearch
                                optionFilterProp="label"
                                value={userId}
                                onChange={setUserId}
                                disabled={false}
                                options={users.map(u => ({ value: u.id, label: u.username }))}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                        <Form.Item
                            name="amount"
                            label="Cantidad"
                            help="Positiva para dar, negativa para quitar"
                            rules={[
                                { required: true, message: 'Pon la cantidad' },
                                { validator: (_, v) => (v === 0 ? Promise.reject(new Error('No puede ser 0')) : Promise.resolve()) },
                            ]}
                        >
                            <InputNumber precision={0} min={-150} max={150} style={{ width: '100%' }} placeholder="Ej. 10 o -5" />
                        </Form.Item>
                        <Form.Item
                            name="note"
                            label="Motivo"
                            rules={[{ required: true, whitespace: true, message: 'Escribe el motivo: lo verá el jugador' }]}
                        >
                            <Input maxLength={120} showCount placeholder="Ej. Compensación por el error de la jornada 3" />
                        </Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={saving}>Aplicar</Button>
                            {!userId && <Text type="secondary">Elige antes un jugador</Text>}
                        </Space>
                    </Form>
                </Card>
            </Col>
            <Col xs={24} lg={14}>
                <Card size="small" title={wallet?.user ? `Pachanguitas de ${wallet.user.username}` : 'Historial'}>
                    {userId ? (
                        <CoinHistory
                            balance={wallet?.balance ?? null}
                            cap={wallet?.cap ?? 150}
                            movements={wallet?.movements || []}
                            loading={loading}
                        />
                    ) : (
                        <Text type="secondary">Elige un jugador para ver su saldo y sus movimientos.</Text>
                    )}
                </Card>
            </Col>
        </Row>
    );
}
