import multer from "multer";
import path from "path";
import fs from "fs";
import {
    ESTADOS_TICKET,
    TIPOS_TICKET,
    crearTicket,
    obtenerTickets,
    obtenerTicketsPorUsuario,
    obtenerTicketPorId,
    actualizarEstadoTicket,
    actualizarMensajeTicket,
    agregarAdjuntosTicket
} from "./soporte.db.js";

const PROJECT_ROOT = process.cwd();
const SOPORTE_UPLOADS_DIR = path.join(PROJECT_ROOT, "public", "uploads", "soporte");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(SOPORTE_UPLOADS_DIR)) {
            fs.mkdirSync(SOPORTE_UPLOADS_DIR, { recursive: true });
        }
        cb(null, SOPORTE_UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    }
});

const upload = multer({ storage });

const normalizarArchivos = (files = []) => {
    return files.map((file) => path.posix.join("soporte", file.filename));
};

const limpiarArchivosSubidos = (files = []) => {
    for (const file of files) {
        if (file?.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    }
};

const soporteRoutes = (app, verificarToken, esAdmin) => {

    app.get("/soporte/tipos", verificarToken, (req, res) => {
        return res.json({
            ok: true,
            tipos: TIPOS_TICKET,
            estados: ESTADOS_TICKET
        });
    });

    app.post("/soporte/tickets", verificarToken, upload.array("adjuntos", 5), async (req, res) => {
        try {
            const archivos = normalizarArchivos(req.files);
            const resultado = await crearTicket(req.usuario.id, req.body, archivos);

            if (!resultado.ok) {
                limpiarArchivosSubidos(req.files);
                return res.status(400).json({ ok: false, message: resultado.message });
            }

            return res.status(201).json({
                ok: true,
                message: resultado.message,
                ticketId: resultado.ticketId
            });
        } catch (error) {
            limpiarArchivosSubidos(req.files);
            console.error("Error en POST /soporte/tickets:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.get("/soporte/mis-tickets", verificarToken, async (req, res) => {
        try {
            const resultado = await obtenerTicketsPorUsuario(req.usuario.id);
            if (!resultado.ok) {
                return res.status(500).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, tickets: resultado.tickets });
        } catch (error) {
            console.error("Error en GET /soporte/mis-tickets:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.get("/soporte/tickets", verificarToken, esAdmin, async (req, res) => {
        try {
            const resultado = await obtenerTickets({
                estado: req.query.estado,
                usuario_id: req.query.usuario_id
            });

            if (!resultado.ok) {
                return res.status(500).json({ ok: false, message: resultado.message });
            }

            return res.json({ ok: true, tickets: resultado.tickets });
        } catch (error) {
            console.error("Error en GET /soporte/tickets:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.get("/soporte/tickets/:id", verificarToken, async (req, res) => {
        try {
            const resultado = await obtenerTicketPorId(req.params.id, req.usuario);
            if (!resultado.ok) {
                return res.status(404).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, ticket: resultado.ticket });
        } catch (error) {
            console.error("Error en GET /soporte/tickets/:id:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.put("/soporte/tickets/:id", verificarToken, async (req, res) => {
        try {
            const resultado = await actualizarMensajeTicket(req.params.id, req.usuario, req.body.mensaje);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, message: resultado.message });
        } catch (error) {
            console.error("Error en PUT /soporte/tickets/:id:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.put("/soporte/tickets/:id/estado", verificarToken, esAdmin, async (req, res) => {
        try {
            const resultado = await actualizarEstadoTicket(req.params.id, req.body.estado);
            if (!resultado.ok) {
                return res.status(400).json({ ok: false, message: resultado.message });
            }
            return res.json({ ok: true, message: resultado.message });
        } catch (error) {
            console.error("Error en PUT /soporte/tickets/:id/estado:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });

    app.post("/soporte/tickets/:id/adjuntos", verificarToken, upload.array("adjuntos", 5), async (req, res) => {
        try {
            const archivos = normalizarArchivos(req.files);
            const resultado = await agregarAdjuntosTicket(req.params.id, req.usuario, archivos);

            if (!resultado.ok) {
                limpiarArchivosSubidos(req.files);
                return res.status(400).json({ ok: false, message: resultado.message });
            }

            return res.status(201).json({ ok: true, message: resultado.message });
        } catch (error) {
            limpiarArchivosSubidos(req.files);
            console.error("Error en POST /soporte/tickets/:id/adjuntos:", error);
            return res.status(500).json({ ok: false, message: "error del servidor" });
        }
    });
};

export default soporteRoutes;
