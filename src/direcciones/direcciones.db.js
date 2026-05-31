import { conexion } from "../../db.js";

const normalizarId = (valor) => Number(valor);
const normalizarTexto = (valor) => String(valor ?? "").trim();

const obtenerDirecciones = async (usuarioId) => {
    try {
        const uid = normalizarId(usuarioId);
        if (!uid) return { ok: false, message: "usuario inválido" };

        const [direcciones] = await conexion.query(
            "SELECT id, direccion, ciudad, departamento FROM direcciones WHERE usuario_id = ? ORDER BY id DESC",
            [uid]
        );

        return { ok: true, direcciones };
    } catch (error) {
        console.error("Error en obtenerDirecciones:", error);
        return { ok: false, message: "error al obtener direcciones" };
    }
};

const crearDireccion = async (usuarioId, datos) => {
    try {
        const uid = normalizarId(usuarioId);
        if (!uid) return { ok: false, message: "usuario inválido" };

        const direccion = normalizarTexto(datos.direccion);
        const ciudad = normalizarTexto(datos.ciudad);
        const departamento = normalizarTexto(datos.departamento);

        if (!direccion) {
            return { ok: false, message: "la dirección es requerida" };
        }

        const [resultado] = await conexion.query(
            "INSERT INTO direcciones (usuario_id, direccion, ciudad, departamento) VALUES (?, ?, ?, ?)",
            [uid, direccion, ciudad || null, departamento || null]
        );

        return {
            ok: true,
            message: "dirección guardada",
            direccionId: resultado.insertId
        };
    } catch (error) {
        console.error("Error en crearDireccion:", error);
        return { ok: false, message: "error al guardar la dirección" };
    }
};

const actualizarDireccion = async (usuarioId, direccionId, datos) => {
    try {
        const uid = normalizarId(usuarioId);
        const did = normalizarId(direccionId);
        if (!uid || !did) return { ok: false, message: "datos inválidos" };

        const direccion = normalizarTexto(datos.direccion);
        const ciudad = normalizarTexto(datos.ciudad);
        const departamento = normalizarTexto(datos.departamento);

        if (!direccion) {
            return { ok: false, message: "la dirección es requerida" };
        }

        const [resultado] = await conexion.query(
            "UPDATE direcciones SET direccion = ?, ciudad = ?, departamento = ? WHERE id = ? AND usuario_id = ?",
            [direccion, ciudad || null, departamento || null, did, uid]
        );

        if (resultado.affectedRows === 0) {
            return { ok: false, message: "dirección no encontrada" };
        }

        return { ok: true, message: "dirección actualizada" };
    } catch (error) {
        console.error("Error en actualizarDireccion:", error);
        return { ok: false, message: "error al actualizar la dirección" };
    }
};

const eliminarDireccion = async (usuarioId, direccionId) => {
    try {
        const uid = normalizarId(usuarioId);
        const did = normalizarId(direccionId);
        if (!uid || !did) return { ok: false, message: "datos inválidos" };

        const [resultado] = await conexion.query(
            "DELETE FROM direcciones WHERE id = ? AND usuario_id = ?",
            [did, uid]
        );

        if (resultado.affectedRows === 0) {
            return { ok: false, message: "dirección no encontrada" };
        }

        return { ok: true, message: "dirección eliminada" };
    } catch (error) {
        console.error("Error en eliminarDireccion:", error);
        return { ok: false, message: "error al eliminar la dirección" };
    }
};

export {
    obtenerDirecciones,
    crearDireccion,
    actualizarDireccion,
    eliminarDireccion
};
