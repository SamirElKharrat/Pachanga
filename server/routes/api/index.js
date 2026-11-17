const router = require("express").Router();
const db = require("../../config/configdb");
const userRoute = require("./user");
const roleRoute = require("./role");
const leagueRoute = require("./league");
const teamRoute = require("./team");
const matchRoute = require("./match");
const predictionRoute = require("./prediction");
const resultRoute = require("./result");
const favoriteTeamRoute = require("./favoriteTeam");
const leagueParticipationRoute = require("./leagueParticipation");
const uploadRoute = require("./upload");
const hallRoute = require("./hall");
const pachangaRoute = require("./pachanga");
const statsRoute = require("./stats");
const questionRoute = require("./question");
const changelogRoute = require("./changelog");
const ruleRoute = require("./rule");

/**
 * Para monitores y para Render: ¿está vivo el servidor y contesta la base de datos?
 *
 * Sin sesión a propósito, y sin nada que no deba verse desde fuera: ni versiones, ni
 * host, ni el mensaje de error de la base. 200 si todo va bien; 503 si la base no
 * contesta en 3 segundos, para que el monitor no se quede esperando.
 *
 * GET /api/health → { ok: true, db: 'up', uptime: 1234 }
 */
const HEALTH_DB_TIMEOUT_MS = 3000;
router.get("/health", async (req, res) => {
    res.set("Cache-Control", "no-store");
    let timer;
    try {
        await Promise.race([
            db.query("SELECT 1"),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error("timeout")), HEALTH_DB_TIMEOUT_MS);
            }),
        ]);
        res.json({ ok: true, db: "up", uptime: Math.round(process.uptime()) });
    } catch (error) {
        console.error("[health] La base de datos no contesta:", error.message);
        res.status(503).json({ ok: false, db: "down" });
    } finally {
        clearTimeout(timer);
    }
});

router.use("/users", userRoute);
router.use("/roles", roleRoute);
router.use("/leagues", leagueRoute);
router.use("/teams", teamRoute);
router.use("/matches", matchRoute);
router.use("/predictions", predictionRoute);
router.use("/results", resultRoute);
router.use("/favoriteTeams", favoriteTeamRoute);
router.use("/leagueParticipations", leagueParticipationRoute);
router.use("/upload", uploadRoute);
router.use("/hall", hallRoute);
router.use("/pachanga", pachangaRoute);
router.use("/stats", statsRoute);
router.use("/questions", questionRoute);
router.use("/changelog", changelogRoute);
router.use("/rules", ruleRoute);

module.exports = router;