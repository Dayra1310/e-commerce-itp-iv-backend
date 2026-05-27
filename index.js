import { configuracion } from "./config.js";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import {
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
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "public", "uploads");
const PUERTO = configuracion.servidor.puerto;
const JWT_EXPIRES_IN = configuracion.seguridad.jwtExpiresIn;
const ES_PRODUCCION = configuracion.servidor.entorno === "production";
const IMAGEN_DEFAULT = "default.jpg";
const TAMANO_MAXIMO_IMAGEN = configuracion.archivos.maxImageSizeBytes;
const secretoJwt = configuracion.seguridad.jwtSecret;

const app = express();

const origenesPermitidos = configuracion.servidor.corsOrigenes;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (origenesPermitidos.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use("/uploads", express.static(UPLOADS_DIR, {
  fallthrough: false,
  dotfiles: "deny",
  maxAge: ES_PRODUCCION ? "1d" : 0,
}));

const extensionesPermitidas = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const extensionSegura = extensionesPermitidas.get(file.mimetype) ?? ".jpg";
    cb(null, `${Date.now()}-${randomUUID()}${extensionSegura}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: TAMANO_MAXIMO_IMAGEN, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!extensionesPermitidas.has(file.mimetype)) {
      return cb(new Error("formato de imagen no permitido"));
    }
    return cb(null, true);
  },
});

const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim());
const validarTelefono = (telefono) => /^[0-9+()\s-]{7,20}$/.test(String(telefono ?? "").trim());

const validarUsuario = ({ nombre, email, password, telefono, rol_id }, requierePassword = true) => {
  if (!String(nombre ?? "").trim()) {
    return "el nombre es obligatorio";
  }

  if (String(nombre).trim().length < 2) {
    return "el nombre debe tener mínimo 2 caracteres";
  }

  if (!validarEmail(email)) {
    return "el correo no tiene un formato válido";
  }

  if (!validarTelefono(telefono)) {
    return "el teléfono no tiene un formato válido";
  }

  if (!Number.isInteger(Number(rol_id))) {
    return "el rol seleccionado no es válido";
  }

  if (Number(rol_id) <= 0) {
    return "el rol seleccionado no es válido";
  }

  if (requierePassword && String(password ?? "").length < 8) {
    return "la contraseña debe tener mínimo 8 caracteres";
  }

  if (!requierePassword && password && String(password).length < 8) {
    return "la nueva contraseña debe tener mínimo 8 caracteres";
  }

  return null;
};

const enviarError = (res, resultado, estadoPorDefecto = 500) => {
  const status = resultado?.status ?? estadoPorDefecto;
  return res.status(status).json({ ok: false, message: resultado?.message ?? "error interno" });
};

const crearCookieSesion = (res, token) => {
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: ES_PRODUCCION,
    sameSite: ES_PRODUCCION ? "none" : "lax",
    maxAge: 1000 * 60 * 60,
    path: "/",
  });
};

const limpiarCookieSesion = (res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: ES_PRODUCCION,
    sameSite: ES_PRODUCCION ? "none" : "lax",
    path: "/",
  });
};

const verificarToken = async (req, res, next) => {
  const token = req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({ ok: false, message: "no autenticado" });
  }

  try {
    const data = jwt.verify(token, secretoJwt);
    const usuario = await obtenerUsuarioAutenticado(data.id);

    if (!usuario) {
      limpiarCookieSesion(res);
      return res.status(401).json({ ok: false, message: "usuario no encontrado" });
    }

    req.usuario = usuario;
    return next();
  } catch (_error) {
    limpiarCookieSesion(res);
    return res.status(403).json({ ok: false, message: "token no válido o expirado" });
  }
};

const esAdmin = (req, res, next) => {
  const rol = String(req.usuario?.nombre_rol ?? "").trim().toLowerCase();

  if (!["administrador", "admin"].includes(rol)) {
    return res.status(403).json({ ok: false, message: "acceso denegado" });
  }

  return next();
};

const eliminarArchivoSeguro = async (nombreArchivo) => {
  if (!nombreArchivo) return;
  if (nombreArchivo === IMAGEN_DEFAULT) return;

  const nombreSeguro = path.basename(nombreArchivo);
  if (nombreSeguro !== nombreArchivo) return;

  const rutaArchivo = path.join(UPLOADS_DIR, nombreSeguro);

  try {
    if (fs.existsSync(rutaArchivo)) {
      await fs.promises.unlink(rutaArchivo);
    }
  } catch (error) {
    console.error("No se pudo eliminar la imagen anterior:", error);
  }
};

app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "ok", timestamp: new Date().toISOString() });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!validarEmail(email)) {
    return res.status(400).json({ ok: false, message: "correo o contraseña inválidos" });
  }

  if (!password) {
    return res.status(400).json({ ok: false, message: "correo o contraseña inválidos" });
  }

  const resultado = await loginUsuario(email, password);

  if (!resultado.ok) {
    return enviarError(res, resultado, 401);
  }

  const token = jwt.sign(
    { id: resultado.usuario.id },
    secretoJwt,
    { expiresIn: JWT_EXPIRES_IN }
  );

  crearCookieSesion(res, token);

  return res.status(200).json({
    ok: true,
    message: "login exitoso",
    usuario: resultado.usuario,
  });
});

app.post("/logout", (_req, res) => {
  limpiarCookieSesion(res);
  res.json({ ok: true, message: "sesión cerrada" });
});

app.get("/admin", verificarToken, esAdmin, (_req, res) => {
  res.json({ ok: true });
});

app.get("/perfil", verificarToken, async (req, res) => {
  const perfil = await obtenerPerfil(req.usuario.id);

  if (!perfil) {
    return res.status(404).json({ ok: false, message: "usuario no encontrado" });
  }

  return res.json({
    ok: true,
    id: perfil.id,
    nombre: perfil.nombre,
    email: perfil.email,
    telefono: perfil.telefono,
    rol_id: perfil.rol_id,
    rol: perfil.nombre_rol,
    imagen: perfil.imagen_usuario_url ?? IMAGEN_DEFAULT,
  });
});

app.put("/perfil", verificarToken, async (req, res) => {
  const resultado = await actualizarPerfilUsuario(req.usuario.id, req.body ?? {});

  if (!resultado.ok) {
    return enviarError(res, resultado, 400);
  }

  return res.json(resultado);
});

app.put("/usuario/imagen", verificarToken, upload.single("imagen"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "no se envió ninguna imagen" });
    }

    const usuario = await obtenerImagenUsuario(req.usuario.id);
    if (!usuario) {
      await eliminarArchivoSeguro(req.file.filename);
      return res.status(404).json({ ok: false, message: "usuario no encontrado" });
    }

    const resultado = await actualizarImagenUsuario(req.usuario.id, req.file.filename);

    if (!resultado.ok) {
      await eliminarArchivoSeguro(req.file.filename);
      return enviarError(res, resultado, 500);
    }

    await eliminarArchivoSeguro(usuario.imagen_usuario_url);

    return res.json({
      ok: true,
      message: "imagen actualizada",
      imagen: req.file.filename,
    });
  } catch (error) {
    if (req.file?.filename) {
      await eliminarArchivoSeguro(req.file.filename);
    }
    console.error("Error en /usuario/imagen:", error);
    return res.status(500).json({ ok: false, message: "error interno al subir la imagen" });
  }
});

app.get("/usuarios", verificarToken, esAdmin, async (_req, res) => {
  const resultado = await usuarios();

  if (!resultado.ok) {
    return enviarError(res, resultado, 500);
  }

  return res.json({ ok: true, usuarios: resultado.usuarios });
});

app.get("/roles", verificarToken, esAdmin, async (_req, res) => {
  const resultado = await obtenerRoles();

  if (!resultado.ok) {
    return enviarError(res, resultado, 500);
  }

  return res.json({ ok: true, roles: resultado.roles });
});

app.post("/agregarUsuario", verificarToken, esAdmin, async (req, res) => {
  const errorValidacion = validarUsuario(req.body ?? {}, true);

  if (errorValidacion) {
    return res.status(400).json({ ok: false, message: errorValidacion });
  }

  const resultado = await agregarUsuario(req.body);

  if (!resultado.ok) {
    return enviarError(res, resultado, 500);
  }

  return res.status(201).json({ ok: true, message: "usuario agregado" });
});

app.put("/usuario/:id", verificarToken, esAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ ok: false, message: "id de usuario inválido" });
  }

  if (id <= 0) {
    return res.status(400).json({ ok: false, message: "id de usuario inválido" });
  }

  const errorValidacion = validarUsuario(req.body ?? {}, false);

  if (errorValidacion) {
    return res.status(400).json({ ok: false, message: errorValidacion });
  }

  const resultado = await editarUsuario({ ...req.body, id });

  if (!resultado.ok) {
    return enviarError(res, resultado, 500);
  }

  return res.json({ ok: true, message: "usuario actualizado" });
});

app.delete("/eliminarUsuario/:id", verificarToken, esAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ ok: false, message: "id de usuario inválido" });
  }

  if (id <= 0) {
    return res.status(400).json({ ok: false, message: "id de usuario inválido" });
  }

  if (id === Number(req.usuario.id)) {
    return res.status(400).json({ ok: false, message: "no puedes eliminar tu propio usuario autenticado" });
  }

  const resultado = await eliminarUsuario(id);

  if (!resultado.ok) {
    return enviarError(res, resultado, 404);
  }

  return res.json({ ok: true, message: "usuario eliminado" });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: `ruta no encontrada: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const mensaje = error.code === "LIMIT_FILE_SIZE"
      ? "la imagen supera el tamaño máximo permitido"
      : "error al procesar la imagen";
    return res.status(400).json({ ok: false, message: mensaje });
  }

  if (error?.message === "formato de imagen no permitido") {
    return res.status(400).json({ ok: false, message: error.message });
  }

  if (String(error?.message ?? "").startsWith("Origen no permitido")) {
    return res.status(403).json({ ok: false, message: error.message });
  }

  console.error("Error no controlado:", error);
  return res.status(500).json({ ok: false, message: "error interno del servidor" });
});

const servidorHttp = app.listen(PUERTO, () => {
  console.log(`Servidor backend activo en http://localhost:${PUERTO}`);
});

servidorHttp.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`No se pudo iniciar el backend: el puerto ${PUERTO} ya está ocupado.`);
    console.error("Cierra el proceso que está usando ese puerto o cambia APP_PORT en el archivo .env.");
    process.exit(1);
  }

  console.error("Error crítico al iniciar el servidor HTTP:", error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("Promesa rechazada no controlada:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Excepción no controlada:", error);
  process.exit(1);
});

const cerrarServidor = (senal) => {
  console.log(`\nRecibida señal ${senal}. Cerrando backend de forma segura...`);

  servidorHttp.close((error) => {
    if (error) {
      console.error("Error al cerrar el servidor:", error);
      process.exit(1);
    }

    console.log("Servidor backend cerrado correctamente.");
    process.exit(0);
  });
};

process.on("SIGINT", cerrarServidor);
process.on("SIGTERM", cerrarServidor);
