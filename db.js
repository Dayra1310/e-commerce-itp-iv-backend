import dotenv from "dotenv";
dotenv.config({ override: true });

import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const obtenerVariableEntorno = (...nombres) => {
    for (const nombre of nombres) {
        const valor = process.env[nombre];
        if (valor !== undefined && String(valor).trim() !== "") {
            return String(valor).trim();
        }
    }
    return "";
};

const obtenerNumeroEntorno = (valor, valorPorDefecto) => {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : valorPorDefecto;
};

const config = {
    host: obtenerVariableEntorno("DB_HOST", "HOST") || "localhost",
    port: obtenerNumeroEntorno(obtenerVariableEntorno("DB_PORT", "PORT_DB"), 3306),
    user: obtenerVariableEntorno("DB_USER", "USER") || "root",
    password: obtenerVariableEntorno("DB_PASSWORD", "PASSWORD"),
    database: obtenerVariableEntorno("DB_NAME", "DATABASE") || "ecommerce_tableros",
    waitForConnections: true,
    connectionLimit: obtenerNumeroEntorno(obtenerVariableEntorno("DB_CONNECTION_LIMIT"), 10),
    queueLimit: 0
};

const RONDAS_BCRYPT = obtenerNumeroEntorno(obtenerVariableEntorno("BCRYPT_SALT_ROUNDS"), 10);
const conexion = mysql.createPool(config);

const normalizarTexto = (valor) => String(valor ?? "").trim();
const normalizarId = (valor) => Number(valor);
const normalizarNumero = (valor) => Number(valor ?? 0);

const esHashBcryptValido = (valor) => /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(valor ?? ""));

// LOGIN USUARIO
const loginUsuario = async (email, password) => {
    try {
        const [usuario] = await conexion.query(
            `SELECT
                u.id,
                u.password,
                u.rol_id,
                r.nombre AS nombre_rol
            FROM usuarios u
            JOIN roles r
                ON u.rol_id = r.id
            WHERE u.email = ?`,
            [normalizarTexto(email)]
        );

        if (usuario.length === 0) {
            return { ok: false, message: "el usuario no existe" };
        }

        const datos = usuario[0];

        if (!esHashBcryptValido(datos.password)) {
            return { ok: false, message: "contraseña almacenada con formato inválido" };
        }

        const passwordCorrecta = await bcrypt.compare(password, datos.password);

        if (!passwordCorrecta) {
            return { ok: false, message: "usuario o contraseña incorrectos" };
        }

        return {
            ok: true,
            id: datos.id,
            rol: datos.rol_id,
            nombre_rol: datos.nombre_rol
        };
    } catch (error) {
        console.error("Error en loginUsuario:", error);
        return { ok: false, message: "error en el servidor" };
    }
};

const obtenerImagenUsuario = async (id) => {
    try {
        const [rows] = await conexion.query(
            "SELECT imagen_usuario_url FROM usuarios WHERE id = ?",
            [normalizarId(id)]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error en obtenerImagenUsuario:", error);
        return null;
    }
};

const actualizarImagenUsuario = async (id, url) => {
    try {
        await conexion.query(
            "UPDATE usuarios SET imagen_usuario_url = ? WHERE id = ?",
            [normalizarTexto(url), normalizarId(id)]
        );
        return { ok: true };
    } catch (error) {
        console.error("Error en actualizarImagenUsuario:", error);
        return { ok: false };
    }
};

const obtenerPerfil = async (id) => {
    try {
        const [usuario] = await conexion.query(
            `SELECT u.nombre, u.imagen_usuario_url,
            r.nombre AS nombre_rol
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.id = ?`,
            [normalizarId(id)]
        );

        return usuario[0] || null;
    } catch (error) {
        console.error("Error en obtenerPerfil:", error);
        return null;
    }
};

const usuarios = async () => {
    try {
        const [usuario] = await conexion.query(`SELECT e.id, e.nombre, e.email, e.telefono, e.rol_id, r.nombre AS nombre_rol
                        FROM usuarios e JOIN roles r ON e.rol_id = r.id WHERE r.nombre != 'cliente' ORDER BY e.id DESC`);
        return { ok: true, usuarios: usuario };
    } catch (error) {
        console.error("Error en usuarios:", error);
        return { ok: false, message: "error en la consulta" };
    }
};

const editarUsuario = async (usuario) => {
    try {
        const id = normalizarId(usuario.id);
        const rolId = normalizarId(usuario.rol_id);
        const nombre = normalizarTexto(usuario.nombre);
        const email = normalizarTexto(usuario.email).toLowerCase();
        const telefono = normalizarTexto(usuario.telefono);
        const password = normalizarTexto(usuario.password);

        if (!id || !rolId || !nombre || !email || !telefono) {
            return { ok: false, message: "datos inválidos para actualizar usuario" };
        }

        const [duplicado] = await conexion.query("SELECT id FROM usuarios WHERE email = ? AND id != ? LIMIT 1",[email, id]
        );
        if (duplicado.length > 0) {
            return { ok: false, message: "ya existe otro usuario con ese email" };
        }

        let query = "UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, rol_id = ?";
        let valores = [nombre, email, telefono, rolId];

        if (password !== "") {
            const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
            query += ", password = ?";
            valores.push(passwordHash);
        }

        query += " WHERE id = ?";
        valores.push(id);

        const [resultados] = await conexion.query(query, valores);
        if (resultados.affectedRows === 0) {
            return { ok: false, message: "usuario no encontrado" };
        }
        return { ok: true, message: "usuario actualizado" };
    } catch (error) {
        console.error("Error en editarUsuario:", error);
        return { ok: false, message: "error en la consulta" };
    }
};

const agregarUsuario = async (usuario) => {
    try {
        const nombre = normalizarTexto(usuario.nombre);
        const email = normalizarTexto(usuario.email).toLowerCase();
        const telefono = normalizarTexto(usuario.telefono);
        const password = normalizarTexto(usuario.password);
        const rolId = normalizarId(usuario.rol_id);

        if (!nombre || !email || !telefono || !password || !rolId) {
            return { ok: false, message: "datos inválidos para crear usuario" };
        }

        const [existe] = await conexion.query("SELECT id FROM usuarios WHERE email = ? LIMIT 1", [email]);
        if (existe.length > 0) {
            return { ok: false, message: "ya existe un usuario con ese email" };
        }

        const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
        const imagenDefault = "default.jpg";

        await conexion.query(`INSERT INTO usuarios
             (nombre, email, password, telefono, rol_id, imagen_usuario_url)
              VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, email, passwordHash, telefono, rolId, imagenDefault]);

        return { ok: true, message: "usuario agregado" };
    } catch (error) {
        console.error("Error en agregarUsuario:", error);
        return { ok: false, message: "error en la consulta" };
    }
};

const obtenerRoles = async () => {
    try {
        const [roles] = await conexion.query("SELECT id, nombre FROM roles WHERE nombre != 'cliente' ORDER BY nombre ASC");
        return { ok: true, roles };
    } catch (error) {
        console.error("Error en obtenerRoles:", error);
        return { ok: false, message: "error al obtener roles" };
    }
};

const obtenerResumenDashboard = async () => {
    try {
        const [totalProductos] = await conexion.query(
            `SELECT COUNT(*) AS totalProductos
            FROM productos`
        );

        const [totalPedidos] = await conexion.query(
            `SELECT COUNT(p.id) AS totalPedidos
            FROM pedidos p
            JOIN usuarios u
                ON p.usuario_id = u.id
            JOIN roles r
                ON u.rol_id = r.id
            WHERE LOWER(TRIM(r.nombre)) = 'cliente'`
        );

        const [totalClientes] = await conexion.query(
            `SELECT COUNT(u.id) AS totalClientes
            FROM usuarios u
            JOIN roles r
                ON u.rol_id = r.id
            WHERE LOWER(TRIM(r.nombre)) = 'cliente'`
        );

        const [ventasTotales] = await conexion.query(
            `SELECT COALESCE(SUM(p.total), 0) AS ventasTotales
            FROM pedidos p
            JOIN usuarios u
                ON p.usuario_id = u.id
            JOIN roles r
                ON u.rol_id = r.id
            JOIN pago pg
                ON pg.id_pedido = p.id
            WHERE LOWER(TRIM(r.nombre)) = 'cliente'
                AND pg.estado_pago = 'pagado'`
        );

        return {
            ok: true,
            resumen: {
                totalProductos: normalizarNumero(totalProductos[0]?.totalProductos),
                totalPedidos: normalizarNumero(totalPedidos[0]?.totalPedidos),
                totalClientes: normalizarNumero(totalClientes[0]?.totalClientes),
                ventasTotales: normalizarNumero(ventasTotales[0]?.ventasTotales)
            }
        };
    } catch (error) {
        console.error("Error en obtenerResumenDashboard:", error);
        return { ok: false, message: "error al obtener resumen del dashboard" };
    }
};

const obtenerProductosTopDashboard = async () => {
    try {
        const [productos] = await conexion.query(
            `SELECT
                pr.nombre AS nombre,
                COALESCE(SUM(dp.cantidad), 0) AS vendidos
            FROM detalle_pedido dp
            JOIN pedidos p
                ON dp.pedido_id = p.id
            JOIN usuarios u
                ON p.usuario_id = u.id
            JOIN roles r
                ON u.rol_id = r.id
            JOIN productos pr
                ON dp.producto_id = pr.id
            WHERE LOWER(TRIM(r.nombre)) = 'cliente'
                AND p.estado <> 'cancelado'
            GROUP BY pr.id, pr.nombre
            ORDER BY vendidos DESC, pr.nombre ASC
            LIMIT 10`
        );

        return {
            ok: true,
            productos: productos.map((producto) => ({
                nombre: producto.nombre,
                vendidos: normalizarNumero(producto.vendidos)
            }))
        };
    } catch (error) {
        console.error("Error en obtenerProductosTopDashboard:", error);
        return { ok: false, message: "error al obtener productos top del dashboard" };
    }
};

const obtenerCategoriasDashboard = async () => {
    try {
        const [categorias] = await conexion.query(
            `SELECT
                c.nombre AS categoria,
                COUNT(p.id) AS cantidad
            FROM categorias c
            LEFT JOIN productos p
                ON p.categoria_id = c.id
            GROUP BY c.id, c.nombre
            ORDER BY cantidad DESC, c.nombre ASC`
        );

        return {
            ok: true,
            categorias: categorias.map((categoria) => ({
                categoria: categoria.categoria,
                cantidad: normalizarNumero(categoria.cantidad)
            }))
        };
    } catch (error) {
        console.error("Error en obtenerCategoriasDashboard:", error);
        return { ok: false, message: "error al obtener categorías del dashboard" };
    }
};

const obtenerMetricasProductos = async () => {
    try {
        const [metricas] = await conexion.query(
            `SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END), 0) AS activos,
                COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS sinStock,
                COALESCE(SUM(CASE WHEN stock > 0 AND stock <= 10 THEN 1 ELSE 0 END), 0) AS bajoStock
            FROM productos`
        );

        return {
            ok: true,
            metricas: {
                total: normalizarNumero(metricas[0]?.total),
                activos: normalizarNumero(metricas[0]?.activos),
                sinStock: normalizarNumero(metricas[0]?.sinStock),
                bajoStock: normalizarNumero(metricas[0]?.bajoStock)
            }
        };
    } catch (error) {
        console.error("Error en obtenerMetricasProductos:", error);
        return { ok: false, message: "error al obtener métricas de productos" };
    }
};

const obtenerProductosBajoStock = async () => {
    try {
        const [productos] = await conexion.query(
            `SELECT
                id,
                nombre,
                stock
            FROM productos
            WHERE stock > 0
                AND stock <= 10
                AND estado = 'activo'
            ORDER BY stock ASC, nombre ASC`
        );

        return {
            ok: true,
            productos: productos.map((producto) => ({
                id: normalizarNumero(producto.id),
                nombre: producto.nombre,
                stock: normalizarNumero(producto.stock)
            }))
        };
    } catch (error) {
        console.error("Error en obtenerProductosBajoStock:", error);
        return { ok: false, message: "error al obtener productos con bajo stock" };
    }
};

const obtenerProductosTopVendidos = async () => {
    try {
        const [productos] = await conexion.query(
            `SELECT
                pr.nombre AS nombre,
                COALESCE(SUM(dp.cantidad), 0) AS vendidos
            FROM detalle_pedido dp
            JOIN pedidos p
                ON dp.pedido_id = p.id
            JOIN usuarios u
                ON p.usuario_id = u.id
            JOIN roles r
                ON u.rol_id = r.id
            JOIN productos pr
                ON dp.producto_id = pr.id
            WHERE LOWER(TRIM(r.nombre)) = 'cliente'
                AND p.estado <> 'cancelado'
            GROUP BY pr.id, pr.nombre
            ORDER BY vendidos DESC, pr.nombre ASC
            LIMIT 10`
        );

        return {
            ok: true,
            productos: productos.map((producto) => ({
                nombre: producto.nombre,
                vendidos: normalizarNumero(producto.vendidos)
            }))
        };
    } catch (error) {
        console.error("Error en obtenerProductosTopVendidos:", error);
        return { ok: false, message: "error al obtener productos más vendidos" };
    }
};

const obtenerProductosCategorias = async () => {
    try {
        const [categorias] = await conexion.query(
            `SELECT
                c.nombre AS nombre,
                COUNT(p.id) AS productos
            FROM categorias c
            LEFT JOIN productos p
                ON p.categoria_id = c.id
            GROUP BY c.id, c.nombre
            ORDER BY productos DESC, c.nombre ASC`
        );

        return {
            ok: true,
            categorias: categorias.map((categoria) => ({
                nombre: categoria.nombre,
                productos: normalizarNumero(categoria.productos)
            }))
        };
    } catch (error) {
        console.error("Error en obtenerProductosCategorias:", error);
        return { ok: false, message: "error al obtener productos por categoría" };
    }
};

const obtenerReporteVentas = async ({ desde, hasta } = {}) => {
    try {
        let sql = `SELECT
                p.id AS idPedido,
                DATE_FORMAT(p.fecha, '%Y-%m-%d') AS fecha,
                COALESCE(CONCAT(c.nombres, ' ', c.apellidos), u.nombre) AS cliente,
                pr.nombre AS producto,
                dp.cantidad AS cantidad,
                dp.precio_unitario AS precioUnitario,
                COALESCE(dp.subtotal, dp.cantidad * dp.precio_unitario) AS total,
                COALESCE(pg.estado_pago, p.estado) AS estado
            FROM detalle_pedido dp
            JOIN pedidos p
                ON dp.pedido_id = p.id
            JOIN usuarios u
                ON p.usuario_id = u.id
            JOIN roles r
                ON u.rol_id = r.id
            JOIN productos pr
                ON dp.producto_id = pr.id
            LEFT JOIN clientes c
                ON p.cliente_id = c.id
            LEFT JOIN pago pg
                ON pg.id_pedido = p.id
            WHERE LOWER(TRIM(r.nombre)) = 'cliente'`;

        const params = [];

        if (desde) {
            sql += ` AND p.fecha >= ?`;
            params.push(desde);
        }
        if (hasta) {
            sql += ` AND p.fecha <= ? + INTERVAL 1 DAY - INTERVAL 1 SECOND`;
            params.push(hasta);
        }

        sql += ` ORDER BY p.fecha DESC, p.id DESC, dp.id ASC`;

        const [ventas] = await conexion.query(sql, params);

        return {
            ok: true,
            ventas: ventas.map((venta) => ({
                idPedido: normalizarNumero(venta.idPedido),
                fecha: venta.fecha,
                cliente: venta.cliente,
                producto: venta.producto,
                cantidad: normalizarNumero(venta.cantidad),
                precioUnitario: normalizarNumero(venta.precioUnitario),
                total: normalizarNumero(venta.total),
                estado: venta.estado
            }))
        };
    } catch (error) {
        console.error("Error en obtenerReporteVentas:", error);
        return { ok: false, message: "error al obtener reporte de ventas" };
    }
};

const obtenerReportePedidos = async ({ desde, hasta } = {}) => {
    try {
        let sql = `SELECT
                p.id AS idPedido,
                COALESCE(CONCAT(c.nombres, ' ', c.apellidos), u.nombre) AS cliente,
                DATE_FORMAT(p.fecha, '%Y-%m-%d') AS fecha,
                p.estado AS estado,
                p.total AS total
            FROM pedidos p
            JOIN usuarios u
                ON p.usuario_id = u.id
            JOIN roles r
                ON u.rol_id = r.id
            LEFT JOIN clientes c
                ON p.cliente_id = c.id
            WHERE LOWER(TRIM(r.nombre)) = 'cliente'`;

        const params = [];

        if (desde) {
            sql += ` AND p.fecha >= ?`;
            params.push(desde);
        }
        if (hasta) {
            sql += ` AND p.fecha <= ? + INTERVAL 1 DAY - INTERVAL 1 SECOND`;
            params.push(hasta);
        }

        sql += ` ORDER BY p.fecha DESC, p.id DESC`;

        const [pedidos] = await conexion.query(sql, params);

        return {
            ok: true,
            pedidos: pedidos.map((pedido) => ({
                idPedido: normalizarNumero(pedido.idPedido),
                cliente: pedido.cliente,
                fecha: pedido.fecha,
                estado: pedido.estado,
                total: normalizarNumero(pedido.total)
            }))
        };
    } catch (error) {
        console.error("Error en obtenerReportePedidos:", error);
        return { ok: false, message: "error al obtener reporte de pedidos" };
    }
};

const obtenerReporteInventario = async () => {
    try {
        const [inventario] = await conexion.query(
            `SELECT
                p.id AS id,
                p.nombre AS producto,
                COALESCE(c.nombre, 'Sin categoría') AS categoria,
                p.stock AS stock,
                p.precio AS precio,
                CASE
                    WHEN p.estado = 'inactivo' THEN 'Inactivo'
                    WHEN p.stock <= 0 THEN 'Sin stock'
                    WHEN p.stock <= 10 THEN 'Bajo stock'
                    ELSE 'Disponible'
                END AS estado
            FROM productos p
            LEFT JOIN categorias c
                ON p.categoria_id = c.id
            ORDER BY p.nombre ASC`
        );

        return {
            ok: true,
            inventario: inventario.map((producto) => ({
                id: normalizarNumero(producto.id),
                producto: producto.producto,
                categoria: producto.categoria,
                stock: normalizarNumero(producto.stock),
                precio: normalizarNumero(producto.precio),
                estado: producto.estado
            }))
        };
    } catch (error) {
        console.error("Error en obtenerReporteInventario:", error);
        return { ok: false, message: "error al obtener reporte de inventario" };
    }
};

const eliminarUsuario = async (id) => {
    try {
        const idUsuario = normalizarId(id);
        if (!idUsuario) {
            return { ok: false, message: "id de usuario inválido" };
        }

        const [resultados] = await conexion.query(`DELETE FROM usuarios WHERE id = ?`, [idUsuario]);
        if (resultados.affectedRows === 0) {
            return { ok: false, message: "usuario no encontrado" };
        }
        return { ok: true, message: "usuario eliminado" };
    } catch (error) {
        console.error("Error en eliminarUsuario:", error);
        return { ok: false, message: "error al eliminar usuario" };
    }
};

export {
    loginUsuario,
    obtenerImagenUsuario,
    actualizarImagenUsuario,
    obtenerPerfil,
    usuarios,
    editarUsuario,
    obtenerRoles,
    agregarUsuario,
    eliminarUsuario,
    obtenerResumenDashboard,
    obtenerProductosTopDashboard,
    obtenerCategoriasDashboard,
    obtenerMetricasProductos,
    obtenerProductosBajoStock,
    obtenerProductosTopVendidos,
    obtenerProductosCategorias,
    obtenerReporteVentas,
    obtenerReportePedidos,
    obtenerReporteInventario
};
