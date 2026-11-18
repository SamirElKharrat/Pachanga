import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Card, Progress, Skeleton, Typography } from 'antd';
import { UserOutlined, LockOutlined, CheckOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { API } from '../../../services/api';
import { showAlert } from '../AlertInfo';
import { CoinIcon } from '../CoinBalance';
import { refreshCosmetics } from '../../../hooks/useCosmetics';
import { useTheme } from '../../../context/ThemeContext';
import { CosmeticFrame, CosmeticName, CosmeticTitle } from './Cosmetic';
import { Banner } from './Banner';
import '../css/shop.css';

const { Text } = Typography;

/** Los tipos de cosmético, en el orden en que se enseñan. */
const KINDS = [
    { kind: 'frame', title: 'Marcos de avatar' },
    { kind: 'color', title: 'Colores de nombre' },
    { kind: 'title', title: 'Títulos' },
    { kind: 'banner', title: 'Banners' },
];

/**
 * El inventario del perfil: todo lo que has desbloqueado (marcos, colores de nombre
 * y títulos) para ponértelo o quitártelo, lo que te falta (apagado, con su precio en
 * la tienda). Las cartas tienen su propia pestaña en el perfil (ProfileCards).
 *
 * Los datos son los de la tienda (GET /shop): no hay un sitio aparte que pueda
 * contradecirla.
 *
 * @param {Object} props
 * @param {Object} props.user - El usuario de la sesión (id, username, logo_url).
 * @param {boolean} [props.preview=true] - Enseñar «Así te ven». En el perfil no hace
 *   falta: la cabecera ya lo enseña.
 */
export default function Inventory({ user, preview = true }) {
    const { getAvatarSrc } = useTheme();
    const nav = useNavigate();
    const [shop, setShop] = useState(null);
    const [busy, setBusy] = useState(null);

    const load = useCallback(async () => {
        try {
            setShop(await API.get('/shop'));
        } catch {
            showAlert('error', 'No se pudo cargar tu inventario');
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const owned = useMemo(() => Object.fromEntries((shop?.owned || []).map(o => [o.item_id, o])), [shop]);

    const equip = async (item, on) => {
        setBusy(item.id);
        try {
            await API.post('/shop/equip', on ? { item_id: item.id } : { slot: item.kind });
            await Promise.all([load(), refreshCosmetics()]);
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo cambiar');
        } finally {
            setBusy(null);
        }
    };

    if (!shop) return <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>;

    const cosmetics = shop.items.filter(i => i.kind !== 'card');
    const unlocked = cosmetics.filter(i => owned[i.id]).length;
    const name = user?.username || 'Tú';

    /** Cómo se ve cada cosmético, en pequeño. */
    const look = (item) => {
        if (item.kind === 'frame') {
            return (
                <CosmeticFrame frame={item.id}>
                    <Avatar size={44} src={getAvatarSrc(user?.logo_url)} icon={<UserOutlined />} />
                </CosmeticFrame>
            );
        }
        if (item.kind === 'color') return <span className="shop-name-sample"><CosmeticName color={item.id}>{name}</CosmeticName></span>;
        if (item.kind === 'banner') return <Banner id={item.id} still={!owned[item.id]} className="shop-banner-thumb" />;
        return <CosmeticTitle title={item.label} style={{ fontSize: 12 }} />;
    };

    return (
        <div className="inventory">
            <Card className="shop-section">
                {preview && <div className="shop-me-row">
                    <CosmeticFrame userId={user?.id}>
                        <Avatar size={56} src={getAvatarSrc(user?.logo_url)} icon={<UserOutlined />} />
                    </CosmeticFrame>
                    <div className="shop-me-text" style={{ flex: 1 }}>
                        <Text type="secondary" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Así te ven</Text>
                        <span className="shop-me-name"><CosmeticName userId={user?.id}>{name}</CosmeticName></span>
                        <CosmeticTitle userId={user?.id} />
                    </div>
                </div>}
                <div className={`inv-progress${preview ? '' : ' alone'}`}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Desbloqueados <b>{unlocked}</b> de {cosmetics.length}</Text>
                    <Progress percent={Math.round((unlocked / cosmetics.length) * 100)} showInfo={false} size="small" strokeColor="var(--accent)" />
                </div>
            </Card>

            {KINDS.map(({ kind, title }) => {
                const items = cosmetics.filter(i => i.kind === kind)
                    .sort((a, b) => Number(Boolean(owned[b.id])) - Number(Boolean(owned[a.id])));
                const mine = items.filter(i => owned[i.id]).length;
                return (
                    <Card key={kind} className="shop-section" title={title} extra={<Text type="secondary" style={{ fontSize: 12 }}>{mine} de {items.length}</Text>}>
                        <div className="shop-grid inv-grid">
                            {items.map(item => {
                                const o = owned[item.id];
                                return (
                                    <div key={item.id} className={`shop-item${o?.equipped ? ' on' : ''}${o ? '' : ' locked'}`}>
                                        <div className="shop-item-look">{look(item)}</div>
                                        <div className="shop-item-name">{o ? null : <LockOutlined style={{ marginRight: 6, fontSize: 12 }} />}{item.label}</div>
                                        <div className="shop-item-foot">
                                            {o?.equipped && <span className="shop-owned on"><CheckOutlined /> Puesto</span>}
                                            {o && !o.equipped && <span className="shop-owned">Tuyo</span>}
                                            {!o && <span className="shop-price"><CoinIcon size={13} /><b>{item.price}</b></span>}
                                            {o?.equipped && <Button size="small" onClick={() => equip(item, false)} loading={busy === item.id}>Quitármelo</Button>}
                                            {o && !o.equipped && <Button size="small" type="primary" ghost onClick={() => equip(item, true)} loading={busy === item.id}>Ponérmelo</Button>}
                                            {!o && <Button size="small" icon={<ShopOutlined />} onClick={() => nav('/tienda')}>Tienda</Button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
