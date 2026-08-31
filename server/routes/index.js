const router = require("express").Router();
const apiRoutes = require("./api");

// API Routes
router.use("/api", apiRoutes);

// Nada ha respondido: la ruta no existe.
//
// Esto devolvía 200. Parece inocente y no lo es: axios solo rechaza a partir del 400,
// así que una URL mal escrita —o una ruta nueva contra un servidor sin reiniciar— se
// resolvía como una petición CORRECTA cuyo cuerpo es este objeto. El `.catch()` del
// cliente no llegaba a ejecutarse nunca, y el componente que esperaba una lista
// recibía un objeto y reventaba la página entera.
//
// Con 404, ese mismo caso cae por el `.catch()` de siempre y se queda en una pantalla
// vacía en vez de en una rota.
router.use((req, res) => {
    res.status(404).json({ mensaje: "No se encontró ninguna ruta API que coincida con la solicitud" });
});

module.exports = router;