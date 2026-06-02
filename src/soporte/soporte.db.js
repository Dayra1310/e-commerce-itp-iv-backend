import { conexion } from "../../db.js";

const normalizarId = (valor) => Number(valor);
const normalizarTexto = (valor) => String(valor ?? "").trim();

const ESTADOS_TICKET = ["abierto", "en_proceso", "respondido", "cerrado", "cancelado"];
const TIPOS_TICKET = [
    "problema con pedido",
    "producto defectuoso",
    "error en pago",
    "consulta",
    "devoluciones"
];

const esAdminUsuario = (usuario) => {
    const rol = normalizarTexto(usuario?.nombre_rol).toLowerCase();
    return rol === "admin";
};

const normalizarEstado = (estado) => {
    const valor = normalizarTexto(estado).toLowerCase();
    return ESTADOS_TICKET.includes(valor) ? valor : "";
};

const normalizarTipo = (tipo) => {
    const valor = normalizarTexto(tipo).toLowerCase();
    return TIPOS_TICKET.includes(valor) ? valor : "";
};

const obtenerAdjuntosPorTicket = async (ticketId) => {
    const [adjuntos] = await conexion.query(
        "SELECT id, ticket_id, archivo FROM ticket_adjuntos WHERE ticket_id = ? ORDER BY id ASC",
        [normalizarId(ticketId)]
    );
    return adjuntos;
};

const crearTicket = async (usuarioId, datos, archivos = []) => {
    try {
        const uid = normalizarId(usuarioId);
        const tipo = normalizarTipo(datos.tipo || datos.asunto);
        const mensaje = normalizarTexto(datos.mensaje);

        if (!uid) return { ok: false, message: "usuario invalido" };
        if (!tipo) return { ok: false, message: "tipo de ticket invalido" };
        if (!mensaje) return { ok: false, message: "mensaje es requerido" };

        const [resultado] = await conexion.query(
            "INSERT INTO tickets (usuario_id, asunto, mensaje, estado, fecha) VALUES (?, ?, ?, 'abierto', NOW())",
            [uid, tipo, mensaje]
        );

        const ticketId = resultado.insertId;

        for (const archivo of archivos) {
            await conexion.query(
                "INSERT INTO ticket_adjuntos (ticket_id, archivo) VALUES (?, ?)",
                [ticketId, archivo]
            );
        }

        return { ok: true, message: "ticket creado", ticketId };
    } catch (error) {
        console.error("Error en crearTicket:", error);
        return { ok: false, message: "error al crear ticket" };
    }
};

const obtenerTickets = async (filtros = {}) => {
    try {
        const condiciones = [];
        const valores = [];

        const estado = normalizarEstado(filtros.estado);
        const usuarioId = normalizarId(filtros.usuario_id);

        if (estado) {
            condiciones.push("t.estado = ?");
            valores.push(estado);
        }

        if (usuarioId) {
            condiciones.push("t.usuario_id = ?");
            valores.push(usuarioId);
        }

        const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

        const [tickets] = await conexion.query(
            `SELECT
                t.id,
                t.usuario_id,
                u.nombre AS usuario_nombre,
                u.email AS usuario_email,
                t.asunto,
                t.mensaje,
                t.estado,
                t.fecha
            FROM tickets t
            JOIN usuarios u ON t.usuario_id = u.id
            ${where}
            ORDER BY t.fecha DESC, t.id DESC`,
            valores
        );

        return { ok: true, tickets };
    } catch (error) {
        console.error("Error en obtenerTickets:", error);
        return { ok: false, message: "error al obtener tickets" };
    }
};

const obtenerTicketsPorUsuario = async (usuarioId) => {
    try {
        const uid = normalizarId(usuarioId);
        if (!uid) return { ok: false, message: "usuario invalido" };

        const [tickets] = await conexion.query(
            `SELECT id, usuario_id, asunto, mensaje, estado, fecha
             FROM tickets
             WHERE usuario_id = ?
             ORDER BY fecha DESC, id DESC`,
            [uid]
        );

        return { ok: true, tickets };
    } catch (error) {
        console.error("Error en obtenerTicketsPorUsuario:", error);
        return { ok: false, message: "error al obtener tickets" };
    }
};

const obtenerTicketPorId = async (ticketId, usuario) => {
    try {
        const tid = normalizarId(ticketId);
        if (!tid) return { ok: false, message: "ticket invalido" };

        const [tickets] = await conexion.query(
            `SELECT
                t.id,
                t.usuario_id,
                u.nombre AS usuario_nombre,
                u.email AS usuario_email,
                t.asunto,
                t.mensaje,
                t.estado,
                t.fecha
            FROM tickets t
            JOIN usuarios u ON t.usuario_id = u.id
            WHERE t.id = ?
            LIMIT 1`,
            [tid]
        );

        if (tickets.length === 0) {
            return { ok: false, message: "ticket no encontrado" };
        }

        const ticket = tickets[0];
        if (!esAdminUsuario(usuario) && ticket.usuario_id !== normalizarId(usuario?.id)) {
            return { ok: false, message: "ticket no encontrado" };
        }

        const adjuntos = await obtenerAdjuntosPorTicket(tid);
        return { ok: true, ticket: { ...ticket, adjuntos } };
    } catch (error) {
        console.error("Error en obtenerTicketPorId:", error);
        return { ok: false, message: "error al obtener ticket" };
    }
};

const actualizarEstadoTicket = async (ticketId, estado) => {
    try {
        const tid = normalizarId(ticketId);
        const nuevoEstado = normalizarEstado(estado);

        if (!tid) return { ok: false, message: "ticket invalido" };
        if (!nuevoEstado) return { ok: false, message: "estado invalido" };

        const [resultado] = await conexion.query(
            "UPDATE tickets SET estado = ? WHERE id = ?",
            [nuevoEstado, tid]
        );

        if (resultado.affectedRows === 0) {
            return { ok: false, message: "ticket no encontrado" };
        }

        return { ok: true, message: "estado actualizado" };
    } catch (error) {
        console.error("Error en actualizarEstadoTicket:", error);
        return { ok: false, message: "error al actualizar estado" };
    }
};

const actualizarMensajeTicket = async (ticketId, usuario, mensaje) => {
    try {
        const tid = normalizarId(ticketId);
        const uid = normalizarId(usuario?.id);
        const nuevoMensaje = normalizarTexto(mensaje);

        if (!tid) return { ok: false, message: "ticket invalido" };
        if (!uid) return { ok: false, message: "usuario invalido" };
        if (!nuevoMensaje) return { ok: false, message: "mensaje es requerido" };

        const [tickets] = await conexion.query(
            "SELECT usuario_id, estado FROM tickets WHERE id = ? LIMIT 1",
            [tid]
        );

        if (tickets.length === 0) {
            return { ok: false, message: "ticket no encontrado" };
        }

        const ticket = tickets[0];
        if (!esAdminUsuario(usuario) && ticket.usuario_id !== uid) {
            return { ok: false, message: "ticket no encontrado" };
        }

        if (!esAdminUsuario(usuario) && ["cerrado", "cancelado"].includes(ticket.estado)) {
            return { ok: false, message: "no se puede editar un ticket cerrado" };
        }

        await conexion.query(
            "UPDATE tickets SET mensaje = ? WHERE id = ?",
            [nuevoMensaje, tid]
        );

        return { ok: true, message: "ticket actualizado" };
    } catch (error) {
        console.error("Error en actualizarMensajeTicket:", error);
        return { ok: false, message: "error al actualizar ticket" };
    }
};

const agregarAdjuntosTicket = async (ticketId, usuario, archivos = []) => {
    try {
        const tid = normalizarId(ticketId);
        const uid = normalizarId(usuario?.id);

        if (!tid) return { ok: false, message: "ticket invalido" };
        if (!uid) return { ok: false, message: "usuario invalido" };
        if (archivos.length === 0) return { ok: false, message: "adjunto es requerido" };

        const [tickets] = await conexion.query(
            "SELECT usuario_id FROM tickets WHERE id = ? LIMIT 1",
            [tid]
        );

        if (tickets.length === 0) {
            return { ok: false, message: "ticket no encontrado" };
        }

        if (!esAdminUsuario(usuario) && tickets[0].usuario_id !== uid) {
            return { ok: false, message: "ticket no encontrado" };
        }

        for (const archivo of archivos) {
            await conexion.query(
                "INSERT INTO ticket_adjuntos (ticket_id, archivo) VALUES (?, ?)",
                [tid, archivo]
            );
        }

        return { ok: true, message: "adjuntos agregados" };
    } catch (error) {
        console.error("Error en agregarAdjuntosTicket:", error);
        return { ok: false, message: "error al agregar adjuntos" };
    }
};

export {
    ESTADOS_TICKET,
    TIPOS_TICKET,
    crearTicket,
    obtenerTickets,
    obtenerTicketsPorUsuario,
    obtenerTicketPorId,
    actualizarEstadoTicket,
    actualizarMensajeTicket,
    agregarAdjuntosTicket
};
