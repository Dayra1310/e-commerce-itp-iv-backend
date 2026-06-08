// ============================================================
// client.routes.js — Módulo de CLIENTES
// Perfil y actualización de datos del cliente autenticado
// Requiere token JWT (verificarToken)
// Usa "conexion" y "obtenerPerfil" exportados desde db.js
// IMPORTANTE: verificarToken guarda datos en req.usuario (NO req.user)
// Formato de respuesta compatible con index.js: {ok, data/message}
// ============================================================

import { conexion, obtenerPerfil } from "../../db.js";

export default function clientRoutes(app, verificarToken) {

  // ── GET /client/profile ──────────────────────────────────
  // Obtiene el perfil del cliente autenticado
  // NOTA: index.js ya tiene GET /perfil que hace lo mismo.
  // Esta ruta es alternativa para tu módulo de clientes.
  app.get("/client/profile", verificarToken, async (req, res) => {
    try {
      // verificarToken guarda en req.usuario (NO req.user)
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
        rol: perfil.nombre_rol,
        imagen: perfil.imagen_usuario_url,
      });
    } catch (error) {
      console.error("Error al obtener perfil:", error.message);
      res.status(500).json({
        ok: false,
        message: "Error al obtener el perfil",
      });
    }
  });

  // ── PUT /client/profile ──────────────────────────────────
  // Actualiza datos del cliente autenticado
  app.put("/client/profile", verificarToken, async (req, res) => {
    const { nombre, telefono } = req.body;

    if (!nombre) {
      return res.status(400).json({
        ok: false,
        message: "El nombre es obligatorio",
      });
    }

    try {
      // verificarToken guarda en req.usuario (NO req.user)
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

  // ── PUT /client/password ─────────────────────────────────
  // Cambia la contraseña del cliente autenticado
  app.put("/client/password", verificarToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        ok: false,
        message: "Contraseña actual y nueva son obligatorias",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "La nueva contraseña debe tener al menos 6 caracteres",
      });
    }

    try {
      const bcrypt = (await import("bcrypt")).default;
      // verificarToken guarda en req.usuario (NO req.user)
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
          message: "Contraseña actual incorrecta",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await conexion.query("UPDATE usuarios SET password = ? WHERE id = ?", [
        hashedPassword,
        req.usuario.id,
      ]);

      res.json({
        ok: true,
        message: "Contraseña actualizada exitosamente",
      });
    } catch (error) {
      console.error("Error al cambiar contraseña:", error.message);
      res.status(500).json({
        ok: false,
        message: "Error al cambiar la contraseña",
      });
    }
  });
}
