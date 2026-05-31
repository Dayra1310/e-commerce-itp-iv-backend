import {
    obtenerCarritoCompleto,
    agregarProductoAlCarrito,
    actualizarCantidadProducto,
    eliminarProductoDelCarrito,
    vaciarCarrito,
    productosQuemados
} from "./cart.db.js";

const cartRoutes = (app, verificarToken) => {

    app.get("/productos", verificarToken, (req, res) => {
        return res.json({ ok: true, productos: productosQuemados });
    });

    app.get("/carrito", verificarToken, async (req, res) => {
        try {
            const resultado = await obtenerCarritoCompleto(req.usuario.id);
            if (!resultado.ok) {
                return res.status(500).json({ ok: false, message: resultado.message });
            }
            return res.json({
                ok: true,
                carritoId: resultado.carritoId,
                items: resultado.items,
                cantidad_items: resultado.items.length,
                total: resultado.total
            });
        } catch (error) {
            console.error("Error en GET /carrito:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.post("/carrito/agregar", verificarToken, async (req, res) => {
        try {
            const { producto_id, cantidad } = req.body;
            if (!producto_id) {
                return res.status(400).json({ ok: false, message: "producto_id es requerido" });
            }
            const resultado = await agregarProductoAlCarrito(req.usuario.id, producto_id, cantidad);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, message: resultado.message });
        } catch (error) {
            console.error("Error en POST /carrito/agregar:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.put("/carrito/actualizar", verificarToken, async (req, res) => {
        try {
            const { producto_id, cantidad } = req.body;
            if (!producto_id || !cantidad) {
                return res.status(400).json({ ok: false, message: "producto_id y cantidad son requeridos" });
            }
            const resultado = await actualizarCantidadProducto(req.usuario.id, producto_id, cantidad);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, message: resultado.message });
        } catch (error) {
            console.error("Error en PUT /carrito/actualizar:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.delete("/carrito/eliminar/:productoId", verificarToken, async (req, res) => {
        try {
            const { productoId } = req.params;
            const resultado = await eliminarProductoDelCarrito(req.usuario.id, productoId);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, message: resultado.message });
        } catch (error) {
            console.error("Error en DELETE /carrito/eliminar/:productoId:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.delete("/carrito/vaciar", verificarToken, async (req, res) => {
        try {
            const resultado = await vaciarCarrito(req.usuario.id);
            if (!resultado.ok) {
                return res.status(500).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, message: resultado.message });
        } catch (error) {
            console.error("Error en DELETE /carrito/vaciar:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });
};

export default cartRoutes;
