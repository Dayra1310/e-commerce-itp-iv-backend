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
    conexion
};
