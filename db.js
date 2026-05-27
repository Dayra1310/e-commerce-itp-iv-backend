import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { configuracion } from "./config.js";

const configConexion = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: process.env.DB_CONNECTION_LIMIT,
  queueLimit: 0,
};

const conexion = mysql.createPool(configConexion);

const RONDAS_BCRYPT = process.env.BCRYPT_SALT_ROUNDS;
const IMAGEN_DEFAULT = "default.jpg";

const normalizarEmail = (email) => String(email ?? "").trim().toLowerCase();

const crearRespuestaError = (message, status = 500) => ({ ok: false, message, status });

const existeRol = async (rolId) => {
  const [roles] = await conexion.query("SELECT id FROM roles WHERE id = ? LIMIT 1", [rolId]);
  return roles.length > 0;
};

const obtenerUsuarioPorEmail = async (email) => {
  const [usuarios] = await conexion.query(
    `SELECT id FROM usuarios WHERE email = ? LIMIT 1`,
    [normalizarEmail(email)]
  );
  return usuarios[0] ?? null;
};

const loginUsuario = async (email, password) => {
  try {
    const [usuarios] = await conexion.query(
      `SELECT
        u.id,
        u.nombre,
        u.email,
        u.password,
        u.telefono,
        u.rol_id,
        u.imagen_usuario_url,
        r.nombre AS nombre_rol
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.email = ?
      LIMIT 1`,
      [normalizarEmail(email)]
    );

    if (usuarios.length === 0) {
      return crearRespuestaError("usuario o contraseña incorrectos", 401);
    }

    const usuario = usuarios[0];
    const passwordCorrecta = await bcrypt.compare(String(password ?? ""), usuario.password);

    if (!passwordCorrecta) {
      return crearRespuestaError("usuario o contraseña incorrectos", 401);
    }

    return {
      ok: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        rol_id: usuario.rol_id,
        nombre_rol: usuario.nombre_rol,
        imagen_usuario_url: usuario.imagen_usuario_url ?? IMAGEN_DEFAULT,
      },
    };
  } catch (error) {
    console.error("Error en loginUsuario:", error);
    return crearRespuestaError("error en el servidor", 500);
  }
};

const obtenerUsuarioAutenticado = async (id) => {
  try {
    const [usuarios] = await conexion.query(
      `SELECT
        u.id,
        u.nombre,
        u.email,
        u.telefono,
        u.rol_id,
        u.imagen_usuario_url,
        r.nombre AS nombre_rol
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ?
      LIMIT 1`,
      [id]
    );

    return usuarios[0] ?? null;
  } catch (error) {
    console.error("Error en obtenerUsuarioAutenticado:", error);
    return null;
  }
};

const obtenerImagenUsuario = async (id) => {
  try {
    const [rows] = await conexion.query(
      "SELECT imagen_usuario_url FROM usuarios WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  } catch (error) {
    console.error("Error en obtenerImagenUsuario:", error);
    return null;
  }
};

const actualizarImagenUsuario = async (id, nombreArchivo) => {
  try {
    const [resultado] = await conexion.query(
      "UPDATE usuarios SET imagen_usuario_url = ? WHERE id = ?",
      [nombreArchivo ?? IMAGEN_DEFAULT, id]
    );

    if (resultado.affectedRows === 0) {
      return crearRespuestaError("usuario no encontrado", 404);
    }

    return { ok: true, message: "imagen actualizada" };
  } catch (error) {
    console.error("Error en actualizarImagenUsuario:", error);
    return crearRespuestaError("error al actualizar la imagen", 500);
  }
};

const obtenerPerfil = async (id) => {
  try {
    return await obtenerUsuarioAutenticado(id);
  } catch (error) {
    console.error("Error en obtenerPerfil:", error);
    return null;
  }
};

const actualizarPerfilUsuario = async (id, datosPerfil) => {
  try {
    const nombre = String(datosPerfil.nombre ?? "").trim();

    if (nombre.length < 2) {
      return crearRespuestaError("el nombre debe tener entre 2 y 80 caracteres", 400);
    }

    if (nombre.length > 80) {
      return crearRespuestaError("el nombre debe tener entre 2 y 80 caracteres", 400);
    }

    const [resultado] = await conexion.query(
      "UPDATE usuarios SET nombre = ? WHERE id = ?",
      [nombre, id]
    );

    if (resultado.affectedRows === 0) {
      return crearRespuestaError("usuario no encontrado", 404);
    }

    return { ok: true, message: "perfil actualizado", nombre };
  } catch (error) {
    console.error("Error en actualizarPerfilUsuario:", error);
    return crearRespuestaError("error al actualizar el perfil", 500);
  }
};

const usuarios = async () => {
  try {
    const [listaUsuarios] = await conexion.query(
      `SELECT
        u.id,
        u.nombre,
        u.email,
        u.telefono,
        u.rol_id,
        u.imagen_usuario_url,
        r.nombre AS nombre_rol
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE LOWER(r.nombre) <> 'cliente'
      ORDER BY u.id DESC`
    );

    return { ok: true, usuarios: listaUsuarios };
  } catch (error) {
    console.error("Error en usuarios:", error);
    return crearRespuestaError("error en la consulta", 500);
  }
};

const editarUsuario = async (usuario) => {
  try {
    const id = Number(usuario.id);
    const nombre = String(usuario.nombre ?? "").trim();
    const email = normalizarEmail(usuario.email);
    const telefono = String(usuario.telefono ?? "").trim();
    const rolId = Number(usuario.rol_id);
    const password = String(usuario.password ?? "");

    const [usuarioActual] = await conexion.query("SELECT id FROM usuarios WHERE id = ? LIMIT 1", [id]);
    if (usuarioActual.length === 0) {
      return crearRespuestaError("usuario no encontrado", 404);
    }

    const [emailDuplicado] = await conexion.query(
      "SELECT id FROM usuarios WHERE email = ? AND id <> ? LIMIT 1",
      [email, id]
    );
    if (emailDuplicado.length > 0) {
      return crearRespuestaError("ya existe un usuario con ese email", 409);
    }

    if (!(await existeRol(rolId))) {
      return crearRespuestaError("el rol seleccionado no existe", 400);
    }

    const columnas = ["nombre = ?", "email = ?", "telefono = ?", "rol_id = ?"];
    const valores = [nombre, email, telefono, rolId];

    if (password.trim() !== "") {
      const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
      columnas.push("password = ?");
      valores.push(passwordHash);
    }

    valores.push(id);

    await conexion.query(
      `UPDATE usuarios SET ${columnas.join(", ")} WHERE id = ?`,
      valores
    );

    return { ok: true, message: "usuario actualizado" };
  } catch (error) {
    console.error("Error en editarUsuario:", error);
    return crearRespuestaError("error en la consulta", 500);
  }
};

const agregarUsuario = async (usuario) => {
  try {
    const nombre = String(usuario.nombre ?? "").trim();
    const email = normalizarEmail(usuario.email);
    const telefono = String(usuario.telefono ?? "").trim();
    const rolId = Number(usuario.rol_id);
    const password = String(usuario.password ?? "");

    const usuarioExistente = await obtenerUsuarioPorEmail(email);
    if (usuarioExistente) {
      return crearRespuestaError("ya existe un usuario con ese email", 409);
    }

    if (!(await existeRol(rolId))) {
      return crearRespuestaError("el rol seleccionado no existe", 400);
    }

    const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);

    await conexion.query(
      `INSERT INTO usuarios
        (nombre, email, password, telefono, rol_id, imagen_usuario_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, email, passwordHash, telefono, rolId, IMAGEN_DEFAULT]
    );

    return { ok: true, message: "usuario agregado" };
  } catch (error) {
    console.error("Error en agregarUsuario:", error);
    return crearRespuestaError("error en la consulta", 500);
  }
};

const obtenerRoles = async () => {
  try {
    const [roles] = await conexion.query(
      "SELECT id, nombre FROM roles WHERE LOWER(nombre) <> 'cliente' ORDER BY nombre ASC"
    );
    return { ok: true, roles };
  } catch (error) {
    console.error("Error en obtenerRoles:", error);
    return crearRespuestaError("error al obtener roles", 500);
  }
};

const eliminarUsuario = async (id) => {
  try {
    const [resultado] = await conexion.query("DELETE FROM usuarios WHERE id = ?", [Number(id)]);

    if (resultado.affectedRows === 0) {
      return crearRespuestaError("usuario no encontrado", 404);
    }

    return { ok: true, message: "usuario eliminado" };
  } catch (error) {
    console.error("Error en eliminarUsuario:", error);
    return crearRespuestaError("error al eliminar usuario", 500);
  }
};

export {
  loginUsuario,
  obtenerUsuarioAutenticado,
  obtenerImagenUsuario,
  actualizarImagenUsuario,
  obtenerPerfil,
  actualizarPerfilUsuario,
  usuarios,
  editarUsuario,
  obtenerRoles,
  agregarUsuario,
  eliminarUsuario,
};
