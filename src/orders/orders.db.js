import { conexion } from "../../db.js";
import { productosQuemados } from "../cart/cart.db.js";

const normalizarId = (valor) => Number(valor);

const procesarCheckout = async (usuarioId) => {
    try {
        const uid = normalizarId(usuarioId);
        if (!uid) return { ok: false, message: "usuario inválido" };

        const [carrito] = await conexion.query(
            "SELECT id FROM carrito WHERE usuario_id = ? AND estado = 'activo' LIMIT 1",
            [uid]
        );

        if (carrito.length === 0) {
            return { ok: false, message: "el carrito está vacío" };
        }

        const carritoId = carrito[0].id;

        const [items] = await conexion.query(
            "SELECT producto_id, cantidad, precio_unitario FROM carrito_items WHERE carrito_id = ?",
            [carritoId]
        );

        if (items.length === 0) {
            return { ok: false, message: "el carrito está vacío" };
        }

        for (const item of items) {
            const [producto] = await conexion.query(
                "SELECT stock FROM productos WHERE id = ? AND estado = 'activo' LIMIT 1",
                [item.producto_id]
            );

            if (producto.length === 0) {
                const prod = productosQuemados.find((p) => p.id === item.producto_id);
                const nombre = prod ? prod.nombre : `ID ${item.producto_id}`;
                return { ok: false, message: `${nombre} ya no está disponible` };
            }

            if (producto[0].stock < item.cantidad) {
                const prod = productosQuemados.find((p) => p.id === item.producto_id);
                const nombre = prod ? prod.nombre : `ID ${item.producto_id}`;
                return {
                    ok: false,
                    message: `stock insuficiente para ${nombre}. Disponible: ${producto[0].stock}, solicitado: ${item.cantidad}`
                };
            }
        }

        const total = items.reduce(
            (sum, item) => sum + Number(item.precio_unitario) * item.cantidad,
            0
        );

        const [pedido] = await conexion.query(
            "INSERT INTO pedidos (usuario_id, estado, total) VALUES (?, 'pendiente', ?)",
            [uid, total]
        );
        const pedidoId = pedido.insertId;

        for (const item of items) {
            await conexion.query(
                "INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
                [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]
            );

            await conexion.query(
                "UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?",
                [item.cantidad, item.producto_id, item.cantidad]
            );
        }

        await conexion.query(
            "INSERT INTO pago (id_pedido, estado_pago) VALUES (?, 'pendiente')",
            [pedidoId]
        );

        await conexion.query(
            "UPDATE carrito SET estado = 'convertido', fecha_actualizacion = NOW() WHERE id = ?",
            [carritoId]
        );

        return { ok: true, message: "compra registrada", pedidoId, total };
    } catch (error) {
        console.error("Error en procesarCheckout:", error);
        return { ok: false, message: "error al procesar el checkout" };
    }
};

const cancelarPedidosExpirados = async () => {
    try {
        const [pedidos] = await conexion.query(
            `SELECT id FROM pedidos
             WHERE estado = 'pendiente'
             AND fecha <= NOW() - INTERVAL 30 MINUTE`
        );

        for (const pedido of pedidos) {
            const [items] = await conexion.query(
                "SELECT producto_id, cantidad FROM detalle_pedido WHERE pedido_id = ?",
                [pedido.id]
            );

            for (const item of items) {
                await conexion.query(
                    "UPDATE productos SET stock = stock + ? WHERE id = ?",
                    [item.cantidad, item.producto_id]
                );
            }

            await conexion.query(
                "UPDATE pedidos SET estado = 'cancelado' WHERE id = ?",
                [pedido.id]
            );

            await conexion.query(
                "UPDATE pago SET estado_pago = 'rechazado' WHERE id_pedido = ?",
                [pedido.id]
            );

            console.log(`Pedido ${pedido.id} cancelado por expiración, stock restaurado`);
        }

        return { ok: true, cancelados: pedidos.length };
    } catch (error) {
        console.error("Error en cancelarPedidosExpirados:", error);
        return { ok: false, message: "error al cancelar pedidos expirados" };
    }
};

const obtenerPedidos = async () => {
    try {
        const [pedidos] = await conexion.query(
            `SELECT
                p.id,
                p.usuario_id,
                u.nombre AS usuario_nombre,
                u.email AS usuario_email,
                p.fecha,
                p.estado,
                p.total
            FROM pedidos p
            JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.fecha DESC`
        );

        return { ok: true, pedidos };
    } catch (error) {
        console.error("Error en obtenerPedidos:", error);
        return { ok: false, message: "error al obtener pedidos" };
    }
};

const obtenerPedidoPorId = async (pedidoId) => {
    try {
        const pid = normalizarId(pedidoId);
        if (!pid) return { ok: false, message: "pedido inválido" };

        const [pedido] = await conexion.query(
            `SELECT
                p.id,
                p.usuario_id,
                u.nombre AS usuario_nombre,
                u.email AS usuario_email,
                p.fecha,
                p.estado,
                p.total
            FROM pedidos p
            JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.id = ?`,
            [pid]
        );

        if (pedido.length === 0) {
            return { ok: false, message: "pedido no encontrado" };
        }

        const [items] = await conexion.query(
            `SELECT
                dp.id AS item_id,
                dp.producto_id,
                dp.cantidad,
                dp.precio_unitario
            FROM detalle_pedido dp
            WHERE dp.pedido_id = ?
            ORDER BY dp.id ASC`,
            [pid]
        );

        const itemsEnriquecidos = items.map((item) => {
            const prod = productosQuemados.find((p) => p.id === item.producto_id);
            return {
                ...item,
                nombre: prod ? prod.nombre : "Producto desconocido",
                descripcion: prod ? prod.descripcion : null
            };
        });

        const [pago] = await conexion.query(
            "SELECT id_pago, estado_pago, fecha_pago FROM pago WHERE id_pedido = ? LIMIT 1",
            [pid]
        );

        return {
            ok: true,
            pedido: {
                ...pedido[0],
                items: itemsEnriquecidos,
                pago: pago[0] || null
            }
        };
    } catch (error) {
        console.error("Error en obtenerPedidoPorId:", error);
        return { ok: false, message: "error al obtener pedido" };
    }
};

const obtenerPedidosPorUsuario = async (usuarioId) => {
    try {
        const uid = normalizarId(usuarioId);
        if (!uid) return { ok: false, message: "usuario inválido" };

        const [pedidos] = await conexion.query(
            `SELECT
                id,
                fecha,
                estado,
                total
            FROM pedidos
            WHERE usuario_id = ?
            ORDER BY fecha DESC`,
            [uid]
        );

        return { ok: true, pedidos };
    } catch (error) {
        console.error("Error en obtenerPedidosPorUsuario:", error);
        return { ok: false, message: "error al obtener pedidos" };
    }
};

export {
    procesarCheckout,
    cancelarPedidosExpirados,
    obtenerPedidos,
    obtenerPedidoPorId,
    obtenerPedidosPorUsuario
};
