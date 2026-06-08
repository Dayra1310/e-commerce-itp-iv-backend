// ============================================================
// catalogoClientes.js — Modulo Catalogo, Clientes y Registro
// Rutas nuevas de nuestro modulo.
// El fix del bug de esAdmin ya esta en el index.js modificado.
//
// Incluye:
// 1. Rutas de registro (POST /auth/registro)
// 2. Rutas de catalogo (productos, categorias) - CONECTADO A SQL
// 3. Rutas de clientes (perfil, contrasena)
//
// Usa: conexion (pool mysql2) y agregarUsuario de db.js
// Formato de respuesta: {ok: true/false, message/data}
// verificarToken guarda en req.usuario (NO req.user)
// ============================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { agregarUsuario, conexion, obtenerPerfil } from "./db.js";

export default function catalogoClientes(app) {
    console.log("Modulo Catalogo, Clientes y Registro inicializado");

    // ================================================
    // Nuestro propio verificarToken (identico al de index.js)
    // Lo necesitamos para nuestras rutas de clientes
    // ================================================
    const verificarToken = (req, res, next) => {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ ok: false, message: "no autenticado" });
        }
        try {
            const data = jwt.verify(token, process.env.SECRET_KEY);
            req.usuario = data;
            next();
        } catch (error) {
            return res.status(403).json({ ok: false, message: "token no valido" });
        }
    };

    // ============================================================
    // 1. RUTAS DE REGISTRO
    // POST /auth/registro - Registra un nuevo cliente
    // ============================================================
    app.post("/auth/registro", async (req, res) => {
        const { nombre, email, password, telefono } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({
                ok: false,
                message: "Nombre, email y contrasena son obligatorios",
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                ok: false,
                message: "El formato del email no es valido",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                ok: false,
                message: "La contrasena debe tener al menos 6 caracteres",
            });
        }

        try {
            const resultado = await agregarUsuario({
                nombre,
                email,
                password,
                telefono: telefono || "",
                rol_id: 2,
            });

            if (resultado.ok) {
                return res.status(201).json({
                    ok: true,
                    message: "Usuario registrado exitosamente",
                });
            } else {
                return res.status(400).json({
                    ok: false,
                    message: resultado.message || "Error al registrar usuario",
                });
            }
        } catch (error) {
            console.error("Error en registro:", error.message);

            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    ok: false,
                    message: "El email ya esta registrado. Intenta con otro.",
                });
            }

            return res.status(500).json({
                ok: false,
                message: "Error interno del servidor al registrar usuario",
            });
        }
    });

    // ============================================================
    // 2. RUTAS DE CATALOGO - CONECTADO A MYSQL
    // GET /catalog/products   - Lista todos los productos activos
    // GET /catalog/categories - Lista todas las categorias activas
    // GET /catalog/products/:id - Detalle de un producto
    // GET /catalog/products/categoria/:categoriaId - Filtrar por categoria
    // Usa conexion.query() directamente (no hay helper en db.js)
    // ============================================================

    // Obtener todos los productos (con nombre de categoria via JOIN)
    app.get("/catalog/products", async (req, res) => {
        try {
            const [productos] = await conexion.query(`
                SELECT p.*, c.nombre AS categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.estado = 'activo'
                ORDER BY p.id DESC
            `);
            res.json({ ok: true, productos });
        } catch (error) {
            console.error("Error al obtener productos:", error.message);
            res.status(500).json({
                ok: false,
                message: "Error al obtener los productos",
            });
        }
    });

    // Obtener categorias activas
    app.get("/catalog/categories", async (req, res) => {
        try {
            const [categorias] = await conexion.query(`
                SELECT * FROM categorias
                WHERE estado = 'activo'
                ORDER BY nombre ASC
            `);
            res.json({ ok: true, categorias });
        } catch (error) {
            console.error("Error al obtener categorias:", error.message);
            res.status(500).json({
                ok: false,
                message: "Error al obtener las categorias",
            });
        }
    });

    // Detalle de un producto
    app.get("/catalog/products/:id", async (req, res) => {
        try {
            const [productos] = await conexion.query(`
                SELECT p.*, c.nombre AS categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.id = ?
            `, [req.params.id]);

            if (productos.length === 0) {
                return res.status(404).json({
                    ok: false,
                    message: "Producto no encontrado",
                });
            }

            res.json({ ok: true, producto: productos[0] });
        } catch (error) {
            console.error("Error al obtener producto:", error.message);
            res.status(500).json({
                ok: false,
                message: "Error al obtener el producto",
            });
        }
    });

    // Filtrar productos por categoria
    app.get("/catalog/products/categoria/:categoriaId", async (req, res) => {
        try {
            const [productos] = await conexion.query(`
                SELECT p.*, c.nombre AS categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.categoria_id = ? AND p.estado = 'activo'
                ORDER BY p.id DESC
            `, [req.params.categoriaId]);
            res.json({ ok: true, productos });
        } catch (error) {
            console.error("Error al filtrar productos:", error.message);
            res.status(500).json({
                ok: false,
                message: "Error al filtrar productos por categoria",
            });
        }
    });

    // ============================================================
    // 3. RUTAS DE CLIENTES
    // GET  /client/profile   - Perfil del cliente autenticado
    // PUT  /client/profile   - Actualizar datos del cliente
    // PUT  /client/password  - Cambiar contrasena
    // Requieren token JWT (verificarToken)
    // ============================================================
    app.get("/client/profile", verificarToken, async (req, res) => {
        try {
            const perfil = await obtenerPerfil(req.usuario.id);

            if (!perfil) {
                return res.status(404).json({
                    ok: false,
                    message: "Usuario no encontrado",
                });
            }

            res.json({
                ok: true,
                nombre: perfil.nombre,
                email: perfil.email,
                telefono: perfil.telefono,
                rol: perfil.nombre_rol,
                imagen: perfil.imagen_usuario_url,
                fechaRegistro: perfil.fecha_registro,
            });
        } catch (error) {
            console.error("Error al obtener perfil:", error.message);
            res.status(500).json({
                ok: false,
                message: "Error al obtener el perfil",
            });
        }
    });

    app.put("/client/profile", verificarToken, async (req, res) => {
        const { nombre, telefono } = req.body;

        if (!nombre) {
            return res.status(400).json({
                ok: false,
                message: "El nombre es obligatorio",
            });
        }

        try {
            await conexion.query(
                "UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?",
                [nombre, telefono || null, req.usuario.id]
            );

            res.json({
                ok: true,
                message: "Perfil actualizado exitosamente",
            });
        } catch (error) {
            console.error("Error al actualizar perfil:", error.message);
            res.status(500).json({
                ok: false,
                message: "Error al actualizar el perfil",
            });
        }
    });

    app.put("/client/password", verificarToken, async (req, res) => {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                ok: false,
                message: "Contrasena actual y nueva son obligatorias",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                ok: false,
                message: "La nueva contrasena debe tener al menos 6 caracteres",
            });
        }

        try {
            const [rows] = await conexion.query(
                "SELECT password FROM usuarios WHERE id = ?",
                [req.usuario.id]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    ok: false,
                    message: "Usuario no encontrado",
                });
            }

            const validPassword = await bcrypt.compare(
                currentPassword,
                rows[0].password
            );
            if (!validPassword) {
                return res.status(401).json({
                    ok: false,
                    message: "Contrasena actual incorrecta",
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await conexion.query(
                "UPDATE usuarios SET password = ? WHERE id = ?",
                [hashedPassword, req.usuario.id]
            );

            res.json({
                ok: true,
                message: "Contrasena actualizada exitosamente",
            });
        } catch (error) {
            console.error("Error al cambiar contrasena:", error.message);
            res.status(500).json({
                ok: false,
                message: "Error al cambiar la contrasena",
            });
        }
    });
}
