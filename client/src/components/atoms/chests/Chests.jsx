import React, { useCallback, useEffect, useState } from 'react';
import { Avatar, Button, Card, Empty, Modal, Skeleton, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { API } from '../../../services/api';
import { showAlert } from '../AlertInfo';
import { CoinIcon } from '../CoinBalance';
import { refreshCoins } from '../../../hooks/useCoins';
import { refreshCosmetics } from '../../../hooks/useCosmetics';
import { useTheme } from '../../../context/ThemeContext';
import { CosmeticFrame, CosmeticName, CosmeticTitle } from '../cosmetics/Cosmetic';
import { Banner } from '../cosmetics/Banner';
import { CardEmblem } from '../cards/CardArt';
import '../css/cards.css';
import ChestOpening from './ChestOpening';
import EsportsChest, { EsportsChestDefs } from './EsportsChest';
import '../css/chests.css';
import '../css/chest-opening.css';

const { Text } = Typography;

/** Lo que te ha tocado, dibujado para la carta de la apertura. */
function PrizeLook({ prize, me }) {
    const { getAvatarSrc } = useTheme();
    if (prize.kind === 'coins') return <span className="prize-coins"><CoinIcon size={28} /><b>{prize.coins}</b></span>;
    // Sin la clase de rareza de las cartas: dentro de la apertura manda el color fijo
    // de la rareza del cofre (en Worlds, el de las cartas se vuelve dorado).
    if (prize.kind === 'card') return <div className="prize-card-emb"><CardEmblem cardKey={prize.card} /></div>;
    if (prize.cosmeticKind === 'frame') {
        return <CosmeticFrame frame={prize.id}><Avatar size={64} src={getAvatarSrc(me?.logo_url)} icon={<UserOutlined />} /></CosmeticFrame>;
    }
    if (prize.cosmeticKind === 'color') return <span className="prize-name"><CosmeticName color={prize.id}>{me?.username || 'Tu nombre'}</CosmeticName></span>;
    if (prize.cosmeticKind === 'title') return <CosmeticTitle title={prize.name} style={{ fontSize: 13, whiteSpace: 'normal' }} />;
    if (prize.cosmeticKind === 'banner') return <Banner id={prize.id} className="prize-banner" />;
    return null;
}

/** Nombre corto del premio, para la carta. */
function prizeShort(prize) {
    if (prize.kind === 'coins') return `${prize.coins} monedas`;
    if (prize.kind === 'card') return prize.label.replace(/^Carta /, '');
    return prize.name || prize.label;
}

/** La línea de debajo del premio. */
function prizeNote(prize) {
    if (prize.converted === 'hand_full') return `Tenías la mano llena: te la pagamos en monedas (+${prize.coins})`;
    if (prize.converted === 'duplicate') return `Ya lo tenías: te lo pagamos a mitad de precio (+${prize.coins})`;
    if (prize.kind === 'card') return 'Va a tu mano de esta liga';
    if (prize.kind === 'cosmetic') return 'Ya está en tu inventario';
    return 'Van a tu saldo';
}

/**
 * Los cofres de competición, en la tienda: uno por liga en juego con cartas.
 * Probabilidades a la vista, contador de la garantía, tope de hoy e historial.
 *
 * @param {Object} props
 * @param {Object} props.me - El usuario (para enseñar el premio con tu foto y nombre).
 * @param {number} props.balance - Tu saldo.
 * @param {Function} [props.onOpened] - Tras abrir (la tienda recarga saldo y cosas).
 */
export default function Chests({ me, balance, onOpened }) {
    const [data, setData] = useState(null);
    const [opening, setOpening] = useState(null); // { phase, prize, chestName, leagueId }
    const [showOdds, setShowOdds] = useState(false);

    const load = useCallback(async () => {
        try {
            setData(await API.get('/chests'));
        } catch {
            setData({ chests: [], table: [], dailyLimit: 3, opensToday: 0, price: 20 });
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    // Abrir: la apertura sale al momento (el cofre se va cargando) y el premio le llega
    // cuando el servidor contesta. El saldo y los cosméticos se refrescan al cerrar,
    // para que el menú no destripe el premio antes de verlo.
    const open = async (chest) => {
        const key = Date.now();
        setOpening({ key, prize: null, chestName: chest.name, leagueId: chest.league.id });
        try {
            const res = await API.post('/chests/open', { league_id: chest.league.id });
            setOpening(o => (o && o.key === key ? { ...o, prize: res.prize } : o));
            load();
            onOpened?.();
        } catch (error) {
            setOpening(null);
            showAlert('error', error?.response?.data?.error || 'No se pudo abrir el cofre');
        }
    };

    const closeOpening = () => {
        const wasCosmetic = opening?.prize?.kind === 'cosmetic';
        setOpening(null);
        refreshCoins({ quiet: true });
        if (wasCosmetic) refreshCosmetics();
    };

    if (!data) return <Card className="shop-section"><Skeleton active paragraph={{ rows: 3 }} /></Card>;

    const left = data.dailyLimit - data.opensToday;
    const currentChest = opening && data.chests.find(c => c.league.id === opening.leagueId);
    const canAgain = Boolean(currentChest) && left > 0 && (balance ?? 0) >= data.price;

    return (
        <Card
            className="shop-section chests"
            title={<><EsportsChestDefs />Cofres</>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Hoy {data.opensToday} de {data.dailyLimit}</Text>}
        >
            {data.chests.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Cada liga en juego con cartas tiene su cofre. Ahora mismo no juegas ninguna." />
            ) : (
                <>
                    <div className="chest-list">
                        {data.chests.map(c => {
                            const why = left <= 0 ? 'Ya has abierto 3 hoy' : (balance ?? 0) < c.price ? `Te faltan ${c.price - (balance ?? 0)}` : null;
                            return (
                                <div key={c.league.id} className="chest-item">
                                    <EsportsChest size={0.95} />
                                    <div className="chest-item-body">
                                        <b className="chest-item-name">{c.name}</b>
                                        <span className="chest-item-guarantee">
                                            {c.guarantee.left === 1 ? 'El próximo es raro seguro' : `Raro seguro en ${c.guarantee.left} aperturas o menos`}
                                        </span>
                                        <Button type="primary" onClick={() => open(c)} disabled={Boolean(why) || Boolean(opening)} title={why || undefined}>
                                            Abrir · <CoinIcon size={13} /> {c.price}
                                        </Button>
                                        {why && <span className="chest-item-why">{why}</span>}
                                    </div>
                                    {c.history.length > 0 && (
                                        <ul className="chest-history" aria-label="Tus últimas aperturas">
                                            {c.history.map(h => (
                                                <li key={h.id} className={`rar-${h.rarity}`}>
                                                    <i />
                                                    <span>{h.label}</span>
                                                    {h.converted && <small>+{h.coins}</small>}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button type="button" className="chest-odds-toggle" onClick={() => setShowOdds(true)}>
                        Ver probabilidades
                    </button>
                    {/* Las probabilidades, en una ventana aparte */}
                    <Modal
                        open={showOdds}
                        onCancel={() => setShowOdds(false)}
                        footer={<Button type="primary" onClick={() => setShowOdds(false)}>Entendido</Button>}
                        title="Probabilidades del cofre"
                        centered
                        width={560}
                    >
                        <div className="chest-odds">
                            {data.table.map(r => (
                                <div key={r.rarity} className={`chest-odds-row rar-${r.rarity}`}>
                                    <span className="chest-odds-rar">{r.label}</span>
                                    <span className="chest-odds-pct">{String(r.pct).replace('.', ',')} %</span>
                                    <span className="chest-odds-prizes">{r.prizes.join(' · ')}</span>
                                </div>
                            ))}
                            <p className="chest-odds-rules">
                                {data.price} monedas, {data.dailyLimit} al día. Tras 10 seguidas sin nada raro, la siguiente es rara o mejor.
                                Las cartas son de la liga del cofre; con la mano llena se pagan en monedas. Un cosmético repetido, a mitad de precio.
                                El dado lo tira el servidor y cada apertura queda guardada.
                            </p>
                        </div>
                    </Modal>
                </>
            )}

            {opening && (
                <ChestOpening
                    key={opening.key}
                    chestName={opening.chestName}
                    prize={opening.prize}
                    prizeLook={opening.prize && <PrizeLook prize={opening.prize} me={me} />}
                    prizeShort={opening.prize ? prizeShort(opening.prize) : ''}
                    note={opening.prize ? prizeNote(opening.prize) : null}
                    onClose={closeOpening}
                    onAgain={canAgain ? () => { refreshCoins({ quiet: true }); if (opening.prize?.kind === 'cosmetic') refreshCosmetics(); open(currentChest); } : undefined}
                />
            )}
        </Card>
    );
}
