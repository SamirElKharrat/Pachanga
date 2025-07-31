const router = require("express").Router();
const apiRoutes = require("./api");

// API Routes
router.use("/api", apiRoutes);

// If no API routes are hit, send the React app
router.use((req, res) => {
    res.status(200).send({ mensaje: "No se encontró ninguna ruta API coincide con la solicitud" });
});

module.exports = router;