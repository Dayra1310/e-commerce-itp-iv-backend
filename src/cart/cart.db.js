import { conexion } from "../../db.js";

const normalizarId = (valor) => Number(valor);

const productosQuemados = [
    { id: 1, nombre: "Tablero acrilico grande", descripcion: "tablero acrilico color blaco de alta calidad", precio: 50000.00, stock: 30 },
    { id: 2, nombre: "Tablro acrilico mediano", descripcion: null, precio: 150000.00, stock: 10 }
];

const obtenerOCrearCarrito = async (usuarioId) => {
    const id = normalizarId(usuarioId);
    if (!id) return { ok: false, message: "usuario inválido" };

    const [existente] = await conexion.query(
        "SELECT id FROM carrito WHERE usuario_id = ? AND estado = 'activo' LIMIT 1",
        [id]
    );

    if (existente.length > 0) {
        return { ok: true, carritoId: existente[0].id };
    }

    const [resultado] = await conexion.query(
        "INSERT INTO carrito (usuario_id, estado) VALUES (?, 'activo')",
        [id]
    );

    return { ok: true, carritoId: resultado.insertId };
};

const obtenerCarritoCompleto = async (usuarioId) => {
    try {
        const id = normalizarId(usuarioId);
        if (!id) return { ok: false, message: "usuario inválido" };

        const [carrito] = await conexion.query(
            "SELECT id FROM carrito WHERE usuario_id = ? AND estado = 'activo' LIMIT 1",
            [id]
        );

        if (carrito.length === 0) {
            return { ok: true, items: [], total: 0 };
        }

        const carritoId = carrito[0].id;

        const [items] = await conexion.query(
            `SELECT
                id AS item_id,
                producto_id,
                cantidad,
                precio_unitario
            FROM carrito_items
            WHERE carrito_id = ?
            ORDER BY id ASC`,
            [carritoId]
        );

        const itemsEnriquecidos = items.map((item) => {
            const prod = productosQuemados.find((p) => p.id === item.producto_id);
            return {
                ...item,
                nombre: prod ? prod.nombre : "Producto desconocido",
                descripcion: prod ? prod.descripcion : null,
                stock: prod ? prod.stock : 0
            };
        });

        const total = itemsEnriquecidos.reduce(
            (sum, item) => sum + Number(item.precio_unitario) * item.cantidad,
            0
        );

        return { ok: true, carritoId, items: itemsEnriquecidos, total };
    } catch (error) {
        console.error("Error en obtenerCarritoCompleto:", error);
        return { ok: false, message: "error al obtener el carrito" };
    }
};

const agregarProductoAlCarrito = async (usuarioId, productoId, cantidad = 1) => {
    try {
        const uid = normalizarId(usuarioId);
        const pid = normalizarId(productoId);
        const cant = Math.max(1, normalizarId(cantidad));

        if (!uid || !pid) {
            return { ok: false, message: "datos inválidos" };
        }

        const [producto] = await conexion.query(
            "SELECT id, precio, stock FROM productos WHERE id = ? AND estado = 'activo' LIMIT 1",
            [pid]
        );

        if (producto.length === 0) {
            return { ok: false, message: "producto no encontrado o inactivo" };
        }

        const stockDisponible = producto[0].stock;
        const precio = producto[0].precio;

        const carrito = await obtenerOCrearCarrito(uid);
        if (!carrito.ok) return carrito;

        const [existente] = await conexion.query(
            "SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND producto_id = ? LIMIT 1",
            [carrito.carritoId, pid]
        );

        if (existente.length > 0) {
            const nuevaCantidad = existente[0].cantidad + cant;
            if (nuevaCantidad > stockDisponible) {
                return { ok: false, message: `stock insuficiente. Disponible: ${stockDisponible}` };
            }
            await conexion.query(
                "UPDATE carrito_items SET cantidad = ?, precio_unitario = ? WHERE id = ?",
                [nuevaCantidad, precio, existente[0].id]
            );
        } else {
            if (cant > stockDisponible) {
                return { ok: false, message: `stock insuficiente. Disponible: ${stockDisponible}` };
            }
            await conexion.query(
                "INSERT INTO carrito_items (carrito_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
                [carrito.carritoId, pid, cant, precio]
            );
        }

        await conexion.query(
            "UPDATE carrito SET fecha_actualizacion = NOW() WHERE id = ?",
            [carrito.carritoId]
        );

        return { ok: true, message: "producto agregado al carrito" };
    } catch (error) {
        console.error("Error en agregarProductoAlCarrito:", error);
        return { ok: false, message: "error al agregar producto" };
    }
};

const actualizarCantidadProducto = async (usuarioId, productoId, cantidad) => {
    try {
        const uid = normalizarId(usuarioId);
        const pid = normalizarId(productoId);
        const cant = normalizarId(cantidad);

        if (!uid || !pid || cant < 1) {
            return { ok: false, message: "datos inválidos" };
        }

        const [producto] = await conexion.query(
            "SELECT id, precio, stock FROM productos WHERE id = ? AND estado = 'activo' LIMIT 1",
            [pid]
        );

        if (producto.length === 0) {
            return { ok: false, message: "producto no encontrado o inactivo" };
        }

        if (cant > producto[0].stock) {
            return { ok: false, message: `stock insuficiente. Disponible: ${producto[0].stock}` };
        }

        const [carrito] = await conexion.query(
            "SELECT id FROM carrito WHERE usuario_id = ? AND estado = 'activo' LIMIT 1",
            [uid]
        );

        if (carrito.length === 0) {
            return { ok: false, message: "carrito no encontrado" };
        }

        const [resultado] = await conexion.query(
            "UPDATE carrito_items SET cantidad = ?, precio_unitario = ? WHERE carrito_id = ? AND producto_id = ?",
            [cant, producto[0].precio, carrito[0].id, pid]
        );

        if (resultado.affectedRows === 0) {
            return { ok: false, message: "producto no encontrado en el carrito" };
        }

        await conexion.query(
            "UPDATE carrito SET fecha_actualizacion = NOW() WHERE id = ?",
            [carrito[0].id]
        );

        return { ok: true, message: "cantidad actualizada" };
    } catch (error) {
        console.error("Error en actualizarCantidadProducto:", error);
        return { ok: false, message: "error al actualizar cantidad" };
    }
};

const eliminarProductoDelCarrito = async (usuarioId, productoId) => {
    try {
        const uid = normalizarId(usuarioId);
        const pid = normalizarId(productoId);

        if (!uid || !pid) {
            return { ok: false, message: "datos inválidos" };
        }

        const [carrito] = await conexion.query(
            "SELECT id FROM carrito WHERE usuario_id = ? AND estado = 'activo' LIMIT 1",
            [uid]
        );

        if (carrito.length === 0) {
            return { ok: false, message: "carrito no encontrado" };
        }

        const [resultado] = await conexion.query(
            "DELETE FROM carrito_items WHERE carrito_id = ? AND producto_id = ?",
            [carrito[0].id, pid]
        );

        if (resultado.affectedRows === 0) {
            return { ok: false, message: "producto no encontrado en el carrito" };
        }

        await conexion.query(
            "UPDATE carrito SET fecha_actualizacion = NOW() WHERE id = ?",
            [carrito[0].id]
        );

        return { ok: true, message: "producto eliminado del carrito" };
    } catch (error) {
        console.error("Error en eliminarProductoDelCarrito:", error);
        return { ok: false, message: "error al eliminar producto" };
    }
};

const vaciarCarrito = async (usuarioId) => {
    try {
        const uid = normalizarId(usuarioId);
        if (!uid) return { ok: false, message: "usuario inválido" };

        const [carrito] = await conexion.query(
            "SELECT id FROM carrito WHERE usuario_id = ? AND estado = 'activo' LIMIT 1",
            [uid]
        );

        if (carrito.length === 0) {
            return { ok: true, message: "carrito ya vacío" };
        }

        await conexion.query(
            "DELETE FROM carrito_items WHERE carrito_id = ?",
            [carrito[0].id]
        );

        await conexion.query(
            "UPDATE carrito SET fecha_actualizacion = NOW() WHERE id = ?",
            [carrito[0].id]
        );

        return { ok: true, message: "carrito vaciado" };
    } catch (error) {
        console.error("Error en vaciarCarrito:", error);
        return { ok: false, message: "error al vaciar carrito" };
    }
};

export {
    obtenerCarritoCompleto,
    agregarProductoAlCarrito,
    actualizarCantidadProducto,
    eliminarProductoDelCarrito,
    vaciarCarrito,
    productosQuemados
};
