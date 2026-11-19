/**
 * Publica el reglamento de cartas, pachanguitas y cofres en Normas (categoría «cartas»)
 * y las novedades de la versión 1.5. Fases 5 y 6 de cartas y cofres (la 6 trae
 * duelos, Robo, Espejo, el escaparate semanal y la carta del partido).
 *
 * Se puede lanzar varias veces: si una norma (mismo año, categoría y título) o una
 * novedad (misma versión y texto) ya está, la actualiza en vez de duplicarla.
 *
 *   node scripts/seedCardRules.js               → normas del año en curso
 *   node scripts/seedCardRules.js --year 2027   → normas de 2027 (el año del piloto)
 *   node scripts/seedCardRules.js --dry         → enseña lo que haría, sin escribir
 *
 * Los números salen del código (precios, tope, probabilidades), así que el
 * reglamento no puede decir otra cosa que lo que hace la web.
 */
require('dotenv').config();
const sequelize = require('../config/configdb');
const Rule = require('../models/rule');
const Changelog = require('../models/changelog');
const { COIN_CAP } = require('../utils/coins');
const { REWARDS } = require('../utils/coinRewards');
const { EFFECTS_PER_ROUND, DOBLE_CAP, GAFE_POINTS, ROBO_POINTS, CARDS } = require('../utils/cards');
const { STAKES } = require('../utils/duels');
const shop = require('../utils/shop');
const chests = require('../utils/chests');

sequelize.options.logging = false;

const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const YEAR = Number(arg('--year')) || new Date().getFullYear();
const DRY = process.argv.includes('--dry');
const CATEGORY = 'cartas';
const VERSION = '1.5';

const priceOf = (id) => shop.itemOf(id).price;
const pct = (bp) => String(bp / 100).replace('.', ',');
const odds = chests.TABLE.map(r => `- ${{ comun: 'Común', poco: 'Poco común', raro: 'Raro', epico: 'Épico', leg: 'Legendario' }[r.rarity]}: ${pct(r.bp)} %`).join('\n');

/** Las normas, en el orden en que se leen. */
const RULES = [
    {
        title: 'Cartas, pachanguitas y cofres: qué es esto',
        content: `En las ligas que lo tengan activado, además de predecir se juega con cartas que suman o quitan puntos, pachanguitas que se ganan jugando y una tienda con cosméticos y cofres.

Lo que hace ganar una liga sigue siendo predecir bien: las cartas tienen topes para que ni el que gasta ni el que ahorra tenga ventaja, y la carta más fuerte (la Doble) no se vende.

Las pachanguitas nunca se compran con dinero real ni se cambian por puntos.`,
    },
    {
        title: 'Pachanguitas',
        content: `Se ganan jugando:

- ${REWARDS.login} por cada día que entras a la web.
- ${REWARDS.round_complete} por enviar la jornada completa.
- ${REWARDS.questions_complete} por contestar todas las preguntas de la jornada.
- ${REWARDS.streak} por cada 3 jornadas seguidas enviadas.
- ${REWARDS.pleno} por hacer pleno.
- ${REWARDS.bottom_half} si acabas la jornada en la mitad de abajo.

Valen en todas las ligas y puedes tener hasta ${COIN_CAP}: lo que ganes con el techo lleno no se suma hasta que gastes. Tu saldo y el historial están en tu perfil.`,
    },
    {
        title: 'Cartas y carta gratis',
        content: `Cada carta es de una liga y caduca cuando la liga acaba. No hay límite de cartas: puedes guardar todas las que compres o te salgan en los cofres.

Cada vez que envías una jornada completa recibes una carta gratis al azar: Escudo, Gafe o Doble. Solo vale en esa jornada: si no la juegas, caduca.

También se consiguen en la tienda y en los cofres.`,
    },
    {
        title: 'Jugar una carta',
        content: `Puedes jugar hasta ${EFFECTS_PER_ROUND} cartas por jornada, y cada carta una sola vez por jornada (la Doble y la Doble Dorada cuentan como la misma). El Chivato y el Espejo van aparte: uno de cada por jornada.

- Se juega hasta que empieza su partido. El Escudo, el Robo y el Espejo, que valen para toda la jornada, hasta que empieza el primero.
- Una carta jugada no se puede retirar: piénsatelo antes.
- Nadie ve tu carta hasta que empieza su partido (o la jornada).
- Los puntos de las cartas se recalculan solos si se corrige un resultado.`,
    },
    {
        title: 'Qué hace cada carta',
        content: `- ${CARDS.escudo.label}: tu primer partido no perfecto de la jornada no suma, pero tampoco rompe el pleno.
- ${CARDS.gafe.label}: eliges rival y partido; si falla el ganador (o no lo votó), pierde ${GAFE_POINTS} puntos.
- ${CARDS.doble.label}: los puntos base y de marcador de un partido se suman dos veces, hasta +${DOBLE_CAP}. No dobla el pleno ni el favorito.
- ${CARDS.dorada.label}: como la Doble, sin tope y doblando también el pleno. Solo sale en los cofres.
- ${CARDS.robo.label}: eliges rival; si haces más puntos que él en la jornada (sin contar cartas), le quitas ${ROBO_POINTS} y te lo quedas. Se decide cuando la jornada tiene todos sus resultados.
- ${CARDS.espejo.label}: si te echan un Gafe o un Robo esta jornada, rebota a quien te lo echó: a ti no te hace nada y se le aplica a él (el Gafe, en el mismo partido: pierde ${GAFE_POINTS} si él falló el ganador). No cuenta para las ${EFFECTS_PER_ROUND} de la jornada.
- ${CARDS.chivato.label}: ves el % de votos de un partido antes de votarlo. No da puntos.

Cada jugador recibe como mucho un castigo (Gafe o Robo, también uno rebotado) por jornada, y un castigo nunca deja su jornada por debajo de 0 puntos. Si te echan el Gafe, te sale un aviso al entrar.`,
    },
    {
        title: 'Tienda',
        content: `Con pachanguitas puedes comprar:

- Cartas para una liga: Escudo (${priceOf('card_escudo')}), Gafe (${priceOf('card_gafe')}), Robo (${priceOf('card_robo')}), Espejo (${priceOf('card_espejo')}) y Chivato (${priceOf('card_chivato')}). La Doble no se vende.
- Marcos de avatar y colores de nombre (${priceOf('frame_baron')}; los animados, Arcoíris y Flame, ${priceOf('frame_flame')}).
- Títulos (${priceOf('title_rey_bo5')}) y banners animados (${priceOf('banner_baron')}).

Los cosméticos son para siempre y se ven en el menú, la clasificación, el Hall of Flame y tu perfil. Se ponen y se quitan desde tu inventario.

Escaparate de la semana: cada lunes salen 4 artículos al azar de la tienda (una carta y tres cosméticos), todos rebajados, cada uno con su descuento (del 15 al 40 %).

Carta del partido: cada partido de hoy de tus ligas con cartas trae una carta barata (Gafe a ${shop.MATCH_CARD_PRICE.gafe} o Chivato a ${shop.MATCH_CARD_PRICE.chivato}) que solo vale en ese partido. Se compra hasta que empieza, una por partido, y caduca si no la juegas.`,
    },
    {
        title: 'Cofres',
        content: `Cada competición con cartas tiene su cofre mientras está en juego. Cuesta ${chests.PRICE} pachanguitas y puedes abrir hasta ${chests.DAILY_LIMIT} al día.

${odds}

Si llevas ${chests.GUARANTEE_AFTER} aperturas seguidas sin nada raro, la siguiente es rara o mejor. Las cartas que tocan van a tu mano de la liga del cofre. Un cosmético repetido se devuelve en pachanguitas, a la mitad de su precio.

El dado lo tira el servidor y cada apertura queda guardada. Las probabilidades se pueden consultar en el propio cofre.`,
    },
    {
        title: 'Duelos',
        content: `En las ligas con cartas puedes retar a alguien para la jornada que toca (la próxima que va a empezar; nunca una ya empezada ni las siguientes). Quien haga más puntos en ella (cartas incluidas) se lleva lo apostado:

- Puntos de liga (${STAKES.points.join(', ')}): pasan del que pierde al que gana, así que el total de la liga no cambia.
- Pachanguitas (${STAKES.coins.join(', ')}): cada uno pone lo suyo y el ganador se lleva el bote. Con empate, cada uno recupera lo suyo.

Un duelo por persona y jornada. Se reta y se acepta hasta que empieza el primer partido; si empieza sin respuesta, caduca y se devuelve lo apostado. Se resuelve cuando todos los partidos tienen resultado, y si se corrige uno, se vuelve a resolver solo. Si te retan, te sale un aviso al entrar.`,
    },
    {
        title: 'Puntos y títulos',
        content: `Los puntos de las cartas y de los duelos cuentan como cualquier otro: en la clasificación de la liga, en el Hall of Flame y en la Pachanga.

Los precios, lo que se gana y las cartas solo se cambian entre ligas, nunca a mitad de una.`,
    },
];

/** Las novedades de la versión 1.5. */
const CHANGES = [
    'Cartas: en las ligas que lo tengan activado, cartas que suman o quitan puntos. Hasta 2 por jornada, y una carta gratis por cada jornada completa.',
    'Pachanguitas: se ganan jugando y se ven en el menú y en tu perfil.',
    'Tienda: cartas, marcos de avatar, colores de nombre, títulos y banners animados.',
    'Cofres de competición, con las probabilidades a la vista y garantía de premio raro.',
    'Perfil nuevo: cabecera de jugador, inventario y cambio de nombre y foto desde la propia cabecera.',
    'Aviso a pantalla completa cuando alguien te echa el Gafe.',
    'Duelos: reta a alguien de tu liga para una jornada y apostad puntos o pachanguitas.',
    'Cartas nuevas: Robo (le quitas 1 a tu rival si le ganas la jornada) y Espejo (te devuelve los castigos).',
    'Tienda: escaparate semanal con cuatro artículos rebajados y la carta del partido de cada día.',
    'Reglamento de cartas, pachanguitas y cofres en Normas.',
];

async function main() {
    console.log(`Normas de ${YEAR}, categoría «${CATEGORY}»${DRY ? ' (sin escribir)' : ''}:`);
    let order = 100; // detrás de las normas generales
    for (const r of RULES) {
        order += 1;
        const existing = await Rule.findOne({ where: { year: YEAR, category: CATEGORY, title: r.title, league_id: null } });
        console.log(`  ${existing ? 'actualizar' : 'crear     '}  ${r.title}`);
        if (DRY) continue;
        if (existing) await existing.update({ content: r.content, order_num: order });
        else await Rule.create({ year: YEAR, category: CATEGORY, title: r.title, content: r.content, order_num: order, league_id: null });
    }

    console.log(`\nNovedades de la versión ${VERSION}:`);
    const date = new Date();
    for (const text of CHANGES) {
        const existing = await Changelog.findOne({ where: { version: VERSION, text } });
        console.log(`  ${existing ? 'ya está   ' : 'crear     '}  ${text}`);
        if (!DRY && !existing) await Changelog.create({ version: VERSION, release_date: date, kind: 'new', text });
    }
}

main()
    .then(() => { console.log('\nHecho.'); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
