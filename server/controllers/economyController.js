const { QueryTypes } = require('sequelize');
const sequelize = require('../config/configdb');
const { COIN_CAP, REASONS } = require('../utils/coins');
const chests = require('../utils/chests');
const shop = require('../utils/shop');
const { CARDS } = require('../utils/cards');

/**
 * El panel de economía (fase 5 de cartas y cofres): cómo van las monedas, la tienda,
 * los cofres y las cartas, para ajustar precios e ingresos entre ligas.
 *
 * GET /economy?days=30&league_id=…
 *   - days: ventana de los movimientos (por defecto 30; 0 = desde siempre).
 *   - league_id: la liga de la que enseñar las cartas (por defecto, la última con
 *     cartas activadas).
 */
const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const RARITY_LABEL = { comun: 'Común', poco: 'Poco común', raro: 'Raro', epico: 'Épico', leg: 'Legendario' };

exports.getEconomy = async (req, res) => {
    try {
        const days = req.query.days === undefined ? 30 : Math.max(0, Number(req.query.days) || 0);
        const since = days > 0 ? new Date(Date.now() - days * 86400000) : new Date(0);

        // ── Saldos ───────────────────────────────────────────────────────────
        const balances = await q(`
            SELECT u.id, u.username, COALESCE(SUM(c.amount), 0)::int AS balance
              FROM "User" u LEFT JOIN "CoinTransaction" c ON c.user_id = u.id
             GROUP BY u.id, u.username`);
        const values = balances.map(b => b.balance).sort((a, b) => a - b);
        const total = values.reduce((s, v) => s + v, 0);
        const median = values.length ? values[Math.floor((values.length - 1) / 2)] : 0;
        const atCap = values.filter(v => v >= COIN_CAP).length;
        const buckets = [
            { label: '0', from: 0, to: 0 },
            { label: '1–24', from: 1, to: 24 },
            { label: '25–49', from: 25, to: 49 },
            { label: '50–99', from: 50, to: 99 },
            { label: '100–149', from: 100, to: COIN_CAP - 1 },
            { label: `${COIN_CAP} (techo)`, from: COIN_CAP, to: Infinity },
        ].map(b => ({ label: b.label, count: values.filter(v => v >= b.from && v <= b.to).length }));

        // ── Movimientos por motivo, en la ventana ────────────────────────────
        const flowsRaw = await q(`
            SELECT reason,
                   COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::int AS earned,
                   COALESCE(-SUM(amount) FILTER (WHERE amount < 0), 0)::int AS spent,
                   COUNT(*)::int AS n
              FROM "CoinTransaction" WHERE created_at >= :since
             GROUP BY reason`, { since });
        const flows = flowsRaw
            .map(f => ({ reason: f.reason, label: REASONS[f.reason] || f.reason, earned: f.earned, spent: f.spent, net: f.earned - f.spent, count: f.n }))
            .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
        const earned = flows.reduce((s, f) => s + f.earned, 0);
        const spent = flows.reduce((s, f) => s + f.spent, 0);

        // ── Tienda ───────────────────────────────────────────────────────────
        const [cosmeticBuys, cardBuys] = await Promise.all([
            q(`SELECT item_id, COUNT(*)::int AS n FROM "UserCosmetic" WHERE source = 'shop' AND acquired_at >= :since GROUP BY item_id`, { since }),
            q(`SELECT card, COUNT(*)::int AS n FROM "UserCard" WHERE source = 'shop' AND created_at >= :since GROUP BY card`, { since }),
        ]);
        const purchases = [
            ...cardBuys.map(r => ({ id: `card_${r.card}`, label: `Carta ${CARDS[r.card]?.label || r.card}`, kind: 'Carta', count: r.n })),
            ...cosmeticBuys.map(r => {
                const item = shop.itemOf(r.item_id);
                return { id: r.item_id, label: item ? item.label : r.item_id, kind: item ? shop.SLOTS[item.kind] : '', count: r.n };
            }),
        ].sort((a, b) => b.count - a.count);

        // ── Cofres ───────────────────────────────────────────────────────────
        const chestRows = await q(`
            SELECT rarity, COUNT(*)::int AS n, COALESCE(SUM(coins), 0)::int AS coins, COALESCE(SUM(cost), 0)::int AS cost,
                   COUNT(*) FILTER (WHERE guaranteed)::int AS guaranteed
              FROM "ChestOpen" WHERE created_at >= :since GROUP BY rarity`, { since });
        const opened = chestRows.reduce((s, r) => s + r.n, 0);
        const chestStats = {
            opened,
            spent: chestRows.reduce((s, r) => s + r.cost, 0),
            coinsBack: chestRows.reduce((s, r) => s + r.coins, 0),
            guaranteed: chestRows.reduce((s, r) => s + r.guaranteed, 0),
            byRarity: chests.TABLE.map(t => {
                const row = chestRows.find(r => r.rarity === t.rarity);
                return { rarity: t.rarity, label: RARITY_LABEL[t.rarity], published: t.bp / 100, count: row?.n || 0, observed: opened ? Math.round(((row?.n || 0) / opened) * 1000) / 10 : 0 };
            }),
        };

        // ── Cartas de una liga ───────────────────────────────────────────────
        const cardLeagues = await q(`SELECT id, name, status FROM "League" WHERE cards_enabled ORDER BY id DESC`);
        const leagueId = Number(req.query.league_id) || cardLeagues[0]?.id || null;
        let cardsView = null;
        if (leagueId) {
            const [plays, perPlayer, free] = await Promise.all([
                q(`SELECT r."order" AS round, cp.card, COUNT(*)::int AS n
                     FROM "CardPlay" cp JOIN "Round" r ON r.id = cp.round_id
                    WHERE cp.league_id = :leagueId AND cp.status = 'active'
                    GROUP BY r."order", cp.card ORDER BY r."order"`, { leagueId }),
                q(`SELECT u.id, u.username, COALESCE(s.points_card, 0)::int AS points_card, COALESCE(s.points, 0)::int AS points
                     FROM "LeagueParticipation" lp
                     JOIN "User" u ON u.id = lp.user_id
                     LEFT JOIN "PlayerLeagueStat" s ON s.user_id = lp.user_id AND s.league_id = lp.league_id
                    WHERE lp.league_id = :leagueId AND lp.week = -1
                    ORDER BY points_card DESC, u.username`, { leagueId }),
                q(`SELECT source, COUNT(*)::int AS n FROM "UserCard" WHERE league_id = :leagueId GROUP BY source`, { leagueId }),
            ]);
            const rounds = [...new Set(plays.map(p => p.round))];
            cardsView = {
                leagueId,
                byRound: rounds.map(r => {
                    const row = { round: r, total: 0 };
                    for (const p of plays.filter(x => x.round === r)) { row[p.card] = p.n; row.total += p.n; }
                    return row;
                }),
                perPlayer,
                sources: Object.fromEntries(free.map(f => [f.source, f.n])),
            };
        }

        res.json({
            days,
            cap: COIN_CAP,
            coins: {
                players: values.length,
                total,
                average: values.length ? Math.round((total / values.length) * 10) / 10 : 0,
                median,
                atCap,
                atCapPct: values.length ? Math.round((atCap / values.length) * 1000) / 10 : 0,
                buckets,
                top: balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 10),
            },
            flows: { earned, spent, net: earned - spent, byReason: flows },
            purchases,
            chests: chestStats,
            cardLeagues,
            cards: cardsView,
            catalog: Object.fromEntries(Object.entries(CARDS).map(([k, c]) => [k, c.label])),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
