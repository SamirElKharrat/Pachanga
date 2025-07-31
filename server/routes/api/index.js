const router = require("express").Router();
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

module.exports = router;