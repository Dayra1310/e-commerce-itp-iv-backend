import bcrypt from "bcrypt";
import {
    conexionClientes,
    normalizarCorreoClientes,
    normalizarIdClientes,
    normalizarTextoClientes
} from "./conexion-clientes.js";

const RONDAS_BCRYPT_CLIENTES = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

const validarCorreoCliente = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

export const obtenerRolCliente = async () => {
    const [roles] = await conexionClientes.query(
        "SELECT id FROM roles WHERE LOWER(TRIM(nombre)) = 'cliente' LIMIT 1"
    );

    return normalizarIdClientes(roles[0]?.id || 2);
};

export const registrarCliente = async ({ nombre, name, email, password, telefono, phone }) => {
    const nombreCliente = normalizarTextoClientes(nombre || name);
    const correoCliente = normalizarCorreoClientes(email);
    const passwordCliente = normalizarTextoClientes(password);
    const telefonoCliente = normalizarTextoClientes(telefono || phone);

    if (!nombreCliente || !correoCliente || !passwordCliente) {
        return { ok: false, message: "Nombre, email y contraseña son obligatorios" };
    }

    if (!validarCorreoCliente(correoCliente)) {
        return { ok: false, message: "El formato del email no es válido" };
    }

    if (passwordCliente.length < 6) {
        return { ok: false, message: "La contraseña debe tener al menos 6 caracteres" };
    }

    const [clientesExistentes] = await conexionClientes.query(
        "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
        [correoCliente]
    );

    if (clientesExistentes.length > 0) {
        return { ok: false, message: "El email ya está registrado. Intenta con otro." };
    }

    const rolCliente = await obtenerRolCliente();
    const passwordHash = await bcrypt.hash(passwordCliente, RONDAS_BCRYPT_CLIENTES);
    const imagenDefault = "default.jpg";

    const [resultado] = await conexionClientes.query(
        `INSERT INTO usuarios
            (nombre, email, password, telefono, rol_id, imagen_usuario_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nombreCliente, correoCliente, passwordHash, telefonoCliente, rolCliente, imagenDefault]
    );

    return {
        ok: true,
        message: "Usuario registrado exitosamente",
        cliente: {
            id: resultado.insertId,
            nombre: nombreCliente,
            name: nombreCliente,
            email: correoCliente,
            telefono: telefonoCliente,
            phone: telefonoCliente,
            rol_id: rolCliente
        }
    };
};

export const obtenerPerfilCliente = async (idUsuario) => {
    const [usuarios] = await conexionClientes.query(
        `SELECT
            u.id,
            u.nombre,
            u.email,
            u.telefono,
            u.fecha_registro,
            u.imagen_usuario_url,
            u.rol_id,
            r.nombre AS nombre_rol
         FROM usuarios u
         JOIN roles r
            ON u.rol_id = r.id
         WHERE u.id = ?
         LIMIT 1`,
        [normalizarIdClientes(idUsuario)]
    );

    return usuarios[0] || null;
};

export const actualizarPerfilCliente = async (idUsuario, { nombre, telefono }) => {
    const nombreCliente = normalizarTextoClientes(nombre);
    const telefonoCliente = normalizarTextoClientes(telefono);

    if (!nombreCliente) {
        return { ok: false, message: "El nombre es obligatorio" };
    }

    const [resultado] = await conexionClientes.query(
        "UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?",
        [nombreCliente, telefonoCliente || null, normalizarIdClientes(idUsuario)]
    );

    if (resultado.affectedRows === 0) {
        return { ok: false, message: "Usuario no encontrado" };
    }

    return { ok: true, message: "Perfil actualizado exitosamente" };
};

export const cambiarPasswordCliente = async (idUsuario, { currentPassword, passwordActual, newPassword, passwordNueva }) => {
    const passwordActualCliente = normalizarTextoClientes(currentPassword || passwordActual);
    const passwordNuevaCliente = normalizarTextoClientes(newPassword || passwordNueva);

    if (!passwordActualCliente || !passwordNuevaCliente) {
        return { ok: false, message: "Contraseña actual y nueva son obligatorias" };
    }

    if (passwordNuevaCliente.length < 6) {
        return { ok: false, message: "La nueva contraseña debe tener al menos 6 caracteres" };
    }

    const [usuarios] = await conexionClientes.query(
        "SELECT password FROM usuarios WHERE id = ? LIMIT 1",
        [normalizarIdClientes(idUsuario)]
    );

    if (usuarios.length === 0) {
        return { ok: false, message: "Usuario no encontrado" };
    }

    const passwordValida = await bcrypt.compare(passwordActualCliente, usuarios[0].password);

    if (!passwordValida) {
        return { ok: false, message: "Contraseña actual incorrecta" };
    }

    const passwordHash = await bcrypt.hash(passwordNuevaCliente, RONDAS_BCRYPT_CLIENTES);

    await conexionClientes.query(
        "UPDATE usuarios SET password = ? WHERE id = ?",
        [passwordHash, normalizarIdClientes(idUsuario)]
    );

    return { ok: true, message: "Contraseña actualizada exitosamente" };
};

export const listarClientes = async () => {
    const [clientes] = await conexionClientes.query(
        `SELECT
            u.id,
            u.nombre,
            u.email,
            u.telefono,
            u.fecha_registro,
            u.imagen_usuario_url,
            r.nombre AS nombre_rol
         FROM usuarios u
         JOIN roles r
            ON u.rol_id = r.id
         WHERE LOWER(TRIM(r.nombre)) = 'cliente'
         ORDER BY u.id DESC`
    );

    return clientes;
};
