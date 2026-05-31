import {
    procesarCheckout,
    obtenerPedidos,
    obtenerPedidoPorId,
    obtenerPedidosPorUsuario
} from "./orders.db.js";

const ordersRoutes = (app, verificarToken, esAdmin) => {

    app.post("/checkout", verificarToken, async (req, res) => {
        try {
            const resultado = await procesarCheckout(req.usuario.id);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({
                ok: true,
                message: resultado.message,
                pedidoId: resultado.pedidoId,
                total: resultado.total
            });
        } catch (error) {
            console.error("Error en POST /checkout:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.get("/pedidos", verificarToken, esAdmin, async (req, res) => {
        try {
            const resultado = await obtenerPedidos();
            if (!resultado.ok) {
                return res.status(500).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, pedidos: resultado.pedidos });
        } catch (error) {
            console.error("Error en GET /pedidos:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.get("/pedidos/:id", verificarToken, esAdmin, async (req, res) => {
        try {
            const resultado = await obtenerPedidoPorId(req.params.id);
            if (!resultado.ok) {
                return res.status(404).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, pedido: resultado.pedido });
        } catch (error) {
            console.error("Error en GET /pedidos/:id:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.get("/mis-pedidos", verificarToken, async (req, res) => {
        try {
            const resultado = await obtenerPedidosPorUsuario(req.usuario.id);
            if (!resultado.ok) {
                return res.status(500).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, pedidos: resultado.pedidos });
        } catch (error) {
            console.error("Error en GET /mis-pedidos:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });
};

export default ordersRoutes;
