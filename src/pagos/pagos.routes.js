import { crearTransaccion, confirmarPago, obtenerPagoPorPedido } from "./pagos.db.js";

const pagosRoutes = (app, verificarToken) => {

    app.post("/pagos/crear", verificarToken, async (req, res) => {
        try {
            const { pedido_id } = req.body;
            if (!pedido_id) {
                return res.status(400).json({ ok: false, message: "pedido_id es requerido" });
            }
            const resultado = await crearTransaccion(pedido_id);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, transaccion: resultado.transaccion });
        } catch (error) {
            console.error("Error en POST /pagos/crear:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.post("/pagos/confirmar", async (req, res) => {
        try {
            const resultado = await confirmarPago(req.body);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, message: resultado.message });
        } catch (error) {
            console.error("Error en POST /pagos/confirmar:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.get("/pagos/:pedidoId", verificarToken, async (req, res) => {
        try {
            const { pedidoId } = req.params;
            const resultado = await obtenerPagoPorPedido(pedidoId);
            if (!resultado.ok) {
                return res.status(404).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, pago: resultado.pago });
        } catch (error) {
            console.error("Error en GET /pagos/:pedidoId:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });
};

export default pagosRoutes;
