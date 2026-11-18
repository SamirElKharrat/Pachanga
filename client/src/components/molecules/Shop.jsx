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
import Chests from '../atoms/chests/Chests';
import { matchName, RARITY_LABEL } from '../../utils/cards';
import '../atoms/css/cards.css';
import '../atoms/css/shop.css';

const { Title, Text } = Typography;

/** El precio, con la moneda (y el de antes tachado, si está rebajado). */
const Price = ({ value, base }) => (
    <span className="shop-price">
        <CoinIcon size={14} />
        {base > value && <s className="shop-price-was">{base}</s>}
        <b>{value}</b>
    </span>
);

/** «a las 18:00», para la carta del partido. */
const hourOf = (date) => new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

/**
 * La tienda (fases 3 y 6 de cartas y cofres): cartas para una liga y cosméticos para
 * siempre (marcos, colores de nombre, títulos y banners), con pachanguitas. Arriba,
 * el escaparate de la semana (con una rebaja) y la carta de los partidos de hoy.
 *
 * Las reglas las pone el servidor (server/utils/shop.js): saldo, que no
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

    const buyMatchCard = async (offer) => {
        setBusy(`match:${offer.match.id}`);
        try {
            await API.post('/shop/match-card', { match_id: offer.match.id });
            showAlert('success', `${offer.label} de ${matchName(offer.match)} a tu mano. Solo vale en ese partido.`);
            refreshCoins({ quiet: true });
            await load();
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo comprar');
        } finally {
            setBusy(null);
        }
    };

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
                description={`Cuesta ${item.price} pachanguitas. Te quedarán ${shop.balance - item.price}.`}
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
                            <div className="shop-item-name">{item.label}{item.rotating && <span className="shop-tag">Solo esta semana</span>}</div>
                            <div className="shop-item-foot">
                                {mine
                                    ? <span className={`shop-owned${mine.equipped ? ' on' : ''}`}>{mine.equipped ? <><CheckOutlined /> Puesto</> : 'Tuyo'}</span>
                                    : <Price value={item.price} base={item.basePrice} />}
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
                <span className="shop-wallet"><CoinIcon size={16} /><b>{shop.balance}</b> / {shop.cap} pachanguitas</span>
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

            {/* El escaparate de la semana: 4 huecos, uno rebajado. Cambia cada lunes. */}
            {shop.showcase?.items?.length > 0 && (
                <Card
                    className="shop-section shop-showcase"
                    title="Escaparate de la semana"
                    extra={<Text type="secondary" style={{ fontSize: 12 }}>Cambia {shop.showcase.daysLeft === 1 ? 'mañana' : `en ${shop.showcase.daysLeft} días`}</Text>}
                >
                    <div className="shop-grid">
                        {shop.showcase.items.map(item => {
                            const mine = owned[item.id];
                            const isCard = item.kind === 'card';
                            const short = shop.balance < item.price;
                            return (
                                <div key={item.id} className={`shop-item${item.deal ? ' deal' : ''}`}
                                    onMouseEnter={() => !isCard && setPreview({ [item.kind]: item.kind === 'title' ? item.label : item.id })}
                                    onMouseLeave={() => setPreview({})}>
                                    {item.deal && <span className="shop-deal">−30 %</span>}
                                    <div className="shop-item-look">
                                        {isCard ? (
                                            <span className={`shop-mini-card rar-${item.rarity}`}><CardEmblem cardKey={item.card} /></span>
                                        ) : item.kind === 'frame' ? avatar(48, item.id)
                                            : item.kind === 'color' ? <span className="shop-name-sample"><CosmeticName color={item.id}>{me?.username || 'Tu nombre'}</CosmeticName></span>
                                                : item.kind === 'title' ? <CosmeticTitle title={item.label} style={{ fontSize: 12 }} />
                                                    : <Banner id={item.id} className="shop-banner-thumb" />}
                                    </div>
                                    <div className="shop-item-name">
                                        {isCard ? `Carta · ${item.label}` : item.label}
                                        {item.rotating && <span className="shop-tag">Solo esta semana</span>}
                                    </div>
                                    <div className="shop-item-foot">
                                        {mine
                                            ? <span className={`shop-owned${mine.equipped ? ' on' : ''}`}>{mine.equipped ? <><CheckOutlined /> Puesto</> : 'Tuyo'}</span>
                                            : <Price value={item.price} base={item.basePrice} />}
                                        {isCard ? (
                                            <Popconfirm
                                                title={`¿Comprar ${item.label}?`}
                                                description={league ? `Para ${league.name}. Cuesta ${item.price}; te quedarán ${shop.balance - item.price}.` : 'No juegas ninguna liga con cartas'}
                                                okText="Comprar"
                                                cancelText="Cancelar"
                                                onConfirm={() => buy(item)}
                                                disabled={short || !league}
                                            >
                                                <Button size="small" type="primary" disabled={short || !league} loading={busy === item.id}>Comprar</Button>
                                            </Popconfirm>
                                        ) : cosmeticAction(item)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* La carta de cada partido de hoy: barata, solo vale en ese partido */}
            {shop.matchCards?.length > 0 && (
                <Card className="shop-section" title="Carta del partido" extra={<Text type="secondary" style={{ fontSize: 12 }}>Hoy · hasta que empiece</Text>}>
                    <div className="shop-match-cards">
                        {shop.matchCards.map(o => {
                            const short = shop.balance < o.price;
                            return (
                                <div key={o.match.id} className={`shop-match-card rar-${o.rarity}`}>
                                    <span className={`shop-mini-card rar-${o.rarity}`}><CardEmblem cardKey={o.card} /></span>
                                    <div className="shop-match-text">
                                        <b>{o.label} · {matchName(o.match)}</b>
                                        <small>{o.league?.name} · a las {hourOf(o.match.date)} · solo vale en este partido</small>
                                    </div>
                                    <div className="shop-item-foot">
                                        {o.bought ? <span className="shop-owned on"><CheckOutlined /> En tu mano</span> : <Price value={o.price} base={o.basePrice} />}
                                        {!o.bought && (
                                            <Popconfirm
                                                title={`¿Comprar ${o.label} para ${matchName(o.match)}?`}
                                                description={`Cuesta ${o.price}; te quedarán ${shop.balance - o.price}. Caduca si no la juegas antes de que empiece.`}
                                                okText="Comprar"
                                                cancelText="Cancelar"
                                                onConfirm={() => buyMatchCard(o)}
                                                disabled={short}
                                            >
                                                <Button size="small" type="primary" disabled={short} loading={busy === `match:${o.match.id}`}>Comprar</Button>
                                            </Popconfirm>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Los cofres de competición: uno por liga en juego con cartas */}
            <Chests me={me} balance={shop.balance} onOpened={load} />

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
                            Van a tu mano de <b>{league?.name}</b> (tienes {league?.inHand}) y caducan cuando acaba la liga. Puedes jugar 2 por jornada, cada una una vez (el Chivato y el Espejo aparte).
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
                                            <Price value={item.price} base={item.basePrice} />
                                            <Popconfirm
                                                title={`¿Comprar ${item.label}?`}
                                                description={`Para ${league?.name}. Cuesta ${item.price}; te quedarán ${shop.balance - item.price}.`}
                                                okText="Comprar"
                                                cancelText="Cancelar"
                                                onConfirm={() => buy(item)}
                                                disabled={short}
                                            >
                                                <Button size="small" type="primary" disabled={short} loading={busy === item.id}
                                                    title={short ? `Te faltan ${item.price - shop.balance}` : undefined}>
                                                    Comprar
                                                </Button>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
