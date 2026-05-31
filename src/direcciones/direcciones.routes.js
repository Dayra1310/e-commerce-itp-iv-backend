import {
    obtenerDirecciones,
    crearDireccion,
    actualizarDireccion,
    eliminarDireccion
} from "./direcciones.db.js";

const direccionesRoutes = (app, verificarToken) => {

    app.get("/direcciones", verificarToken, async (req, res) => {
        try {
            const resultado = await obtenerDirecciones(req.usuario.id);
            if (!resultado.ok) {
                return res.status(500).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, direcciones: resultado.direcciones });
        } catch (error) {
            console.error("Error en GET /direcciones:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.post("/direcciones", verificarToken, async (req, res) => {
        try {
            const { direccion, ciudad, departamento } = req.body;
            if (!direccion) {
                return res.status(400).json({ ok: false, message: "la dirección es requerida" });
            }
            const resultado = await crearDireccion(req.usuario.id, { direccion, ciudad, departamento });
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.status(201).json({
                ok: true,
                message: resultado.message,
                direccionId: resultado.direccionId
            });
        } catch (error) {
            console.error("Error en POST /direcciones:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.put("/direcciones/:id", verificarToken, async (req, res) => {
        try {
            const { direccion, ciudad, departamento } = req.body;
            if (!direccion) {
                return res.status(400).json({ ok: false, message: "la dirección es requerida" });
            }
            const resultado = await actualizarDireccion(req.usuario.id, req.params.id, { direccion, ciudad, departamento });
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, message: resultado.message });
        } catch (error) {
            console.error("Error en PUT /direcciones/:id:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.delete("/direcciones/:id", verificarToken, async (req, res) => {
        try {
            const resultado = await eliminarDireccion(req.usuario.id, req.params.id);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, message: resultado.message });
        } catch (error) {
            console.error("Error en DELETE /direcciones/:id:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });
};

export default direccionesRoutes;
