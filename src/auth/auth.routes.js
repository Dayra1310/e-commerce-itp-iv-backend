// ============================================================
// auth.routes.js — Módulo de AUTENTICACIÓN (Registro)
// Solo maneja REGISTRO. El LOGIN ya está en index.js original.
// Compatible con el formato de respuesta del index.js: {ok, message}
// ============================================================

import { agregarUsuario } from "../../db.js";

export default function authRoutes(app) {

  // ── POST /auth/registro ──────────────────────────────────
  // Registra un nuevo usuario/cliente en la base de datos
  app.post("/auth/registro", async (req, res) => {
    const { nombre, email, password, telefono } = req.body;

    // Validación de campos obligatorios
    if (!nombre || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Nombre, email y contraseña son obligatorios",
      });
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        ok: false,
        message: "El formato del email no es válido",
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    try {
      // agregarUsuario recibe un OBJETO {nombre, email, password, telefono, rol_id}
      // rol_id = 2 (cliente por defecto)
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

      // Email duplicado por si acaso no lo captura agregarUsuario
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          ok: false,
          message: "El email ya está registrado. Intenta con otro.",
        });
      }

      return res.status(500).json({
        ok: false,
        message: "Error interno del servidor al registrar usuario",
      });
    }
  });
}
