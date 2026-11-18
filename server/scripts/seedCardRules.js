/**
 * Publica el reglamento de cartas, pachanguitas y cofres en Normas (categoría «cartas»)
 * y las novedades de la versión 1.5. Fase 5 de cartas y cofres.
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
const { EFFECTS_PER_ROUND, DOBLE_CAP, GAFE_POINTS, CARDS } = require('../utils/cards');
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
        content: `Puedes jugar hasta ${EFFECTS_PER_ROUND} cartas por jornada, y cada carta una sola vez por jornada (la Doble y la Doble Dorada cuentan como la misma). El Chivato va aparte: uno por jornada.

- Se juega y se retira hasta que empieza su partido. El Escudo, que vale para toda la jornada, hasta que empieza el primero.
- Nadie ve tu carta hasta que empieza su partido.
- Los puntos de las cartas se recalculan solos si se corrige un resultado.`,
    },
    {
        title: 'Qué hace cada carta',
        content: `- ${CARDS.escudo.label}: tu primer partido no perfecto de la jornada no suma, pero tampoco rompe el pleno.
- ${CARDS.gafe.label}: eliges rival y partido; si falla el ganador (o no lo votó), pierde ${GAFE_POINTS} puntos.
- ${CARDS.doble.label}: los puntos base y de marcador de un partido se suman dos veces, hasta +${DOBLE_CAP}. No dobla el pleno ni el favorito.
- ${CARDS.dorada.label}: como la Doble, sin tope y doblando también el pleno. Solo sale en los cofres.
- ${CARDS.chivato.label}: ves el % de votos de un partido antes de votarlo. No da puntos.

Cada jugador recibe como mucho un castigo (Gafe) por jornada, y un castigo nunca deja su jornada por debajo de 0 puntos. Si te echan el Gafe, te sale un aviso al entrar.`,
    },
    {
        title: 'Tienda',
        content: `Con pachanguitas puedes comprar:

- Cartas para una liga: Escudo (${priceOf('card_escudo')}), Gafe (${priceOf('card_gafe')}) y Chivato (${priceOf('card_chivato')}). La Doble no se vende.
- Marcos de avatar y colores de nombre (${priceOf('frame_baron')}; los animados, Arcoíris y Flame, ${priceOf('frame_flame')}).
- Títulos (${priceOf('title_rey_bo5')}) y banners animados (${priceOf('banner_baron')}).

Los cosméticos son para siempre y se ven en el menú, la clasificación, el Hall of Flame y tu perfil. Se ponen y se quitan desde tu inventario.`,
    },
    {
        title: 'Cofres',
        content: `Cada competición con cartas tiene su cofre mientras está en juego. Cuesta ${chests.PRICE} pachanguitas y puedes abrir hasta ${chests.DAILY_LIMIT} al día.

${odds}

Si llevas ${chests.GUARANTEE_AFTER} aperturas seguidas sin nada raro, la siguiente es rara o mejor. Las cartas que tocan van a tu mano de la liga del cofre. Un cosmético repetido se devuelve en pachanguitas, a la mitad de su precio.

El dado lo tira el servidor y cada apertura queda guardada. Las probabilidades se pueden consultar en el propio cofre.`,
    },
    {
        title: 'Puntos y títulos',
        content: `Los puntos de las cartas cuentan como cualquier otro: en la clasificación de la liga, en el Hall of Flame y en la Pachanga.

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
