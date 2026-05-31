import { obtenerCupones, validarCupon } from "./cupones.db.js";

const cuponesRoutes = (app, verificarToken) => {

    app.get("/cupones", verificarToken, async (req, res) => {
        try {
            const resultado = await obtenerCupones();
            return res.json({ ok: true, cupones: resultado.cupones });
        } catch (error) {
            console.error("Error en GET /cupones:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.post("/cupones/validar", verificarToken, async (req, res) => {
        try {
            const { codigo } = req.body;
            if (!codigo) {
                return res.status(400).json({ ok: false, message: "código del cupón es requerido" });
            }
            const resultado = await validarCupon(codigo);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, cupon: resultado.cupon });
        } catch (error) {
            console.error("Error en POST /cupones/validar:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });
};

export default cuponesRoutes;
