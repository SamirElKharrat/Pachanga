import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Card, Empty, Popconfirm, Select, Skeleton, Space, Typography } from 'antd';
import { ShopOutlined, UserOutlined, CheckOutlined } from '@ant-design/icons';
import { API } from '../../services/api';
import { showAlert } from '../atoms/AlertInfo';
import { CoinIcon } from '../atoms/CoinBalance';
import { refreshCoins } from '../../hooks/useCoins';
import { refreshCosmetics } from '../../hooks/useCosmetics';
import { useTheme } from '../../context/ThemeContext';
import { CosmeticFrame, CosmeticName, CosmeticTitle } from '../atoms/cosmetics/Cosmetic';
import { CardEmblem } from '../atoms/cards/CardArt';
import { Banner, BannerBackground } from '../atoms/cosmetics/Banner';
import { RARITY_LABEL } from '../../utils/cards';
import '../atoms/css/cards.css';
import '../atoms/css/shop.css';

const { Title, Text } = Typography;

/** El precio, con la moneda. */
const Price = ({ value }) => (
    <span className="shop-price"><CoinIcon size={14} /><b>{value}</b></span>
);

/**
 * La tienda (fase 3 de cartas y cofres): cartas para una liga y cosméticos para
 * siempre (marcos, colores de nombre y títulos), con monedas.
 *
 * Las reglas las pone el servidor (server/utils/shop.js): saldo, mano llena, que no
 * se compre dos veces. Aquí se enseña qué hay, cómo te queda y lo que diga si algo
 * no vale.
 */
export default function Shop() {
    const { getAvatarSrc } = useTheme();
    const [shop, setShop] = useState(null);
    const [me, setMe] = useState(null);
    const [leagueId, setLeagueId] = useState(null);
    const [busy, setBusy] = useState(null);
    const [preview, setPreview] = useState({});

    const load = useCallback(async () => {
        try {
            const [s, user] = await Promise.all([API.get('/shop'), API.getUserByToken().catch(() => null)]);
            setShop(s);
            setMe(user);
            setLeagueId(prev => (s.cardLeagues.some(l => l.id === prev) ? prev : s.cardLeagues[0]?.id ?? null));
        } catch {
            showAlert('error', 'No se pudo cargar la tienda');
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const owned = useMemo(() => Object.fromEntries((shop?.owned || []).map(o => [o.item_id, o])), [shop]);
    const equippedOf = (kind) => shop?.items.find(i => i.kind === kind && owned[i.id]?.equipped)?.id ?? null;

    const buy = async (item) => {
        setBusy(item.id);
        try {
            await API.post('/shop/buy', { item_id: item.id, league_id: item.kind === 'card' ? leagueId : undefined });
            showAlert('success', item.kind === 'card' ? `${item.label} a tu mano` : `${item.label} es tuyo. Póntelo cuando quieras.`);
            refreshCoins({ quiet: true });
            await load();
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo comprar');
        } finally {
            setBusy(null);
        }
    };

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

    if (!shop) {
        return <div className="shop-page"><Skeleton active paragraph={{ rows: 8 }} /></div>;
    }

    const league = shop.cardLeagues.find(l => l.id === leagueId);
    const handFull = league && league.inHand >= league.handLimit;
    const byKind = (kind) => shop.items.filter(i => i.kind === kind);

    // Lo que se ve en «Así te ven»: lo puesto, o lo que estés mirando.
    const shown = {
        frame: preview.frame !== undefined ? preview.frame : equippedOf('frame'),
        color: preview.color !== undefined ? preview.color : equippedOf('color'),
        title: preview.title !== undefined ? preview.title : shop.items.find(i => i.id === equippedOf('title'))?.label ?? null,
        banner: preview.banner !== undefined ? preview.banner : equippedOf('banner'),
    };
    const avatar = (size, frame) => (
        <CosmeticFrame frame={frame}>
            <Avatar size={size} src={getAvatarSrc(me?.logo_url)} icon={<UserOutlined />} />
        </CosmeticFrame>
    );

    /** El botón de cada cosmético: comprar, ponérselo o quitárselo. */
    const cosmeticAction = (item) => {
        const mine = owned[item.id];
        if (mine?.equipped) {
            return <Button size="small" onClick={() => equip(item, false)} loading={busy === item.id}>Quitármelo</Button>;
        }
        if (mine) {
            return <Button size="small" type="primary" ghost onClick={() => equip(item, true)} loading={busy === item.id}>Ponérmelo</Button>;
        }
        const short = shop.balance < item.price;
        return (
            <Popconfirm
                title={`¿Comprar «${item.label}»?`}
                description={`Cuesta ${item.price} monedas. Te quedarán ${shop.balance - item.price}.`}
                okText="Comprar"
                cancelText="Cancelar"
                onConfirm={() => buy(item)}
                disabled={short}
            >
                <Button size="small" type="primary" disabled={short} loading={busy === item.id} title={short ? `Te faltan ${item.price - shop.balance}` : undefined}>
                    Comprar
                </Button>
            </Popconfirm>
        );
    };

    const cosmeticSection = (kind, title, hint, render) => (
        <Card className="shop-section" title={title} extra={<Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text>}>
            <div className="shop-grid">
                {byKind(kind).map(item => {
                    const mine = owned[item.id];
                    return (
                        <div
                            key={item.id}
                            className={`shop-item${mine?.equipped ? ' on' : ''}`}
                            onMouseEnter={() => setPreview({ [kind]: kind === 'title' ? item.label : item.id })}
                            onMouseLeave={() => setPreview({})}
                        >
                            <div className="shop-item-look">{render(item)}</div>
                            <div className="shop-item-name">{item.label}</div>
                            <div className="shop-item-foot">
                                {mine
                                    ? <span className={`shop-owned${mine.equipped ? ' on' : ''}`}>{mine.equipped ? <><CheckOutlined /> Puesto</> : 'Tuyo'}</span>
                                    : <Price value={item.price} />}
                                {cosmeticAction(item)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );

    return (
        <div className="shop-page">
            <div className="shop-head">
                <Title level={3} style={{ margin: 0 }}><ShopOutlined /> Tienda</Title>
                <span className="shop-wallet"><CoinIcon size={16} /><b>{shop.balance}</b> / {shop.cap} monedas</span>
            </div>

            <Card className="shop-section shop-me" styles={{ body: { padding: 0 } }}>
                <div className="shop-me-inner cos-banner-host">
                <BannerBackground banner={shown.banner || null} veil="left" />
                <div className="shop-me-row">
                    {avatar(56, shown.frame)}
                    <div className="shop-me-text">
                        <Text type="secondary" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Así te ven</Text>
                        <span className="shop-me-name"><CosmeticName color={shown.color}>{me?.username || 'Tú'}</CosmeticName></span>
                        <CosmeticTitle title={shown.title} />
                    </div>
                </div>
                <Text type="secondary" className="shop-me-hint" style={{ fontSize: 12 }}>
                    Pasa por encima de un artículo para ver cómo te queda. Lo que te pones sale en la clasificación, el Hall of Flame y tu perfil.
                </Text>
                </div>
            </Card>

            <Card
                className="shop-section"
                title="Cartas"
                extra={shop.cardLeagues.length > 0 && (
                    <Select
                        size="small"
                        value={leagueId}
                        onChange={setLeagueId}
                        options={shop.cardLeagues.map(l => ({ value: l.id, label: l.name }))}
                        style={{ minWidth: 180 }}
                        aria-label="Liga donde va la carta"
                    />
                )}
            >
                {shop.cardLeagues.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ahora mismo no juegas ninguna liga con cartas." />
                ) : (
                    <>
                        <p className="shop-note">
                            Van a tu mano de <b>{league?.name}</b> ({league?.inHand} de {league?.handLimit}) y caducan cuando acaba la liga.
                            La Doble no se vende: sale en la carta gratis y en los cofres.
                        </p>
                        <div className="shop-cards">
                            {byKind('card').map(item => {
                                const short = shop.balance < item.price;
                                return (
                                    <div key={item.id} className="shop-card">
                                        <div className={`card-tile rar-${item.rarity}`} title={item.description}>
                                            <span className="card-rar"><span>{RARITY_LABEL[item.rarity] || ''}</span><span className="card-gem" /></span>
                                            <CardEmblem cardKey={item.card} />
                                            <b>{item.label}</b>
                                            <p>{item.description}</p>
                                        </div>
                                        <div className="shop-item-foot">
                                            <Price value={item.price} />
                                            <Popconfirm
                                                title={`¿Comprar ${item.label}?`}
                                                description={`Para ${league?.name}. Cuesta ${item.price}; te quedarán ${shop.balance - item.price}.`}
                                                okText="Comprar"
                                                cancelText="Cancelar"
                                                onConfirm={() => buy(item)}
                                                disabled={short || handFull}
                                            >
                                                <Button size="small" type="primary" disabled={short || handFull} loading={busy === item.id}
                                                    title={handFull ? 'Tienes la mano llena' : short ? `Te faltan ${item.price - shop.balance}` : undefined}>
                                                    Comprar
                                                </Button>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {handFull && <p className="shop-note warn">Tienes la mano llena en esta liga: juega una carta antes de comprar otra.</p>}
                    </>
                )}
            </Card>

            {cosmeticSection('frame', 'Marcos de avatar', 'Para siempre', item => avatar(48, item.id))}
            {cosmeticSection('color', 'Colores de nombre', 'Para siempre', item => (
                <span className="shop-name-sample"><CosmeticName color={item.id}>{me?.username || 'Tu nombre'}</CosmeticName></span>
            ))}
            {cosmeticSection('title', 'Títulos', 'Para siempre', item => (
                <Space direction="vertical" size={0} align="center">
                    <span className="shop-name-sample small">{me?.username || 'Tu nombre'}</span>
                    <CosmeticTitle title={item.label} style={{ fontSize: 12 }} />
                </Space>
            ))}
            {cosmeticSection('banner', 'Banners', 'Tu perfil, tu tarjeta y tu fila en la clasificación', item => (
                <Banner id={item.id} className="shop-banner-thumb" />
            ))}
        </div>
    );
}
