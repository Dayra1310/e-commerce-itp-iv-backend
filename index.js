import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    loginUsuario,
    obtenerImagenUsuario,
    actualizarImagenUsuario,
    obtenerPerfil,
    usuarios,
    editarUsuario,
    obtenerRoles,
    agregarUsuario,
    eliminarUsuario,
    obtenerResumenDashboard,
    obtenerProductosTopDashboard,
    obtenerCategoriasDashboard,
    obtenerMetricasProductos,
    obtenerProductosBajoStock,
    obtenerProductosTopVendidos,
    obtenerProductosCategorias,
    obtenerReporteVentas,
    obtenerReportePedidos,
    obtenerReporteInventario
} from "./db.js";
import cartRoutes from "./src/cart/cart.routes.js";
import ordersRoutes from "./src/orders/orders.routes.js";
import { cancelarPedidosExpirados } from "./src/orders/orders.db.js";
import cuponesRoutes from "./src/cupones/cupones.routes.js";
import direccionesRoutes from "./src/direcciones/direcciones.routes.js";
import pagosRoutes from "./src/pagos/pagos.routes.js";
import soporteRoutes from "./src/soporte/soporte.routes.js";


const PROJECT_ROOT = process.cwd();
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'public', 'uploads');

// ========== CONFIGURACIÓN DE MULTER ==========
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Crear la carpeta si no existe
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });

        }
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const nombre = Date.now() + ext;
        cb(null, nombre);
    }
});

const upload = multer({ storage });

// ========== SERVIDOR ==========
const puerto = 3001;
const app = express();

const origenesPermitidos = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
]

app.use(cors({
    origin: (origen, callback) => {
        if(!origen){
            return callback(null, true)
        }
        if(origenesPermitidos.includes(origen)){
            return callback(null, true)
        }
        return callback(new Error("origen no permitido por CORS"))
    },
    credentials: true
}));


app.use(express.json());
app.use(cookieParser());

// Servir archivos estáticos desde la misma carpeta absoluta
app.use("/uploads", express.static(UPLOADS_DIR));

// ========== ENDPOINTS ==========
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const resultados = await loginUsuario(email, password);
        if (!resultados.ok) {
            return res.status(401).json({ ok: false, message: resultados.message });
        }
        const token = jwt.sign(
            {
                id: resultados.id,
                rol_id: resultados.rol,
                nombre_rol: resultados.nombre_rol
            },
            process.env.SECRET_KEY,
            { expiresIn: "1h" }
        );
        res.cookie("access_token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60
        });
        return res.status(200).json({ ok: true, message: "login exitoso" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "error de servidor" });
    }
});

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
        return res.status(403).json({ ok: false, message: "token no válido" });
    }
};

const esAdmin = (req, res, next) => {
    const nombreRol = String(req.usuario?.nombre_rol || "").trim().toLowerCase();

    if (nombreRol !== "administrador") {
        return res.status(403).json({ ok: false, message: "acceso denegado" });
    }

    next();
};

const esUsuarioInterno = (req, res, next) => {
    const nombreRol = String(req.usuario?.nombre_rol || "").trim().toLowerCase();

    if (nombreRol === "cliente") {
        return res.status(403).json({ ok: false, message: "acceso denegado para clientes" });
    }

    next();
};

app.get("/admin", verificarToken, esAdmin, (req, res) => {
    res.json({ ok: true });
});

app.post("/logout", (req, res) => {
    res.clearCookie("access_token", { httpOnly: true, sameSite: "lax", secure: false });
    res.json({ ok: true, message: "sesión cerrada" });
});

app.get("/perfil", verificarToken, async (req, res) => {
    try {
        const perfil = await obtenerPerfil(req.usuario.id);
        if (!perfil) {
            return res.status(404).json({ ok: false, message: "usuario no encontrado" });
        }
        return res.json({
            ok: true,
            nombre: perfil.nombre,
            rol: perfil.nombre_rol,
            imagen: perfil.imagen_usuario_url
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "error al obtener perfil" });
    }
});

app.put("/usuario/imagen", verificarToken, upload.single("imagen"), async (req, res) => {
    try {
        const userId = req.usuario.id;

        if (!req.file) {
            return res.status(400).json({ ok: false, message: "no se envió ninguna imagen" });
        }

        const usuario = await obtenerImagenUsuario(userId);
        if (!usuario) {
            // Eliminar archivo si el usuario no existe
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ ok: false, message: "usuario no encontrado" });
        }

        // Eliminar imagen anterior si existe y no es default
        const imagenAnterior = usuario.imagen_usuario_url;
        if (imagenAnterior && imagenAnterior !== "default.jpg") {
            const rutaAnterior = path.join(UPLOADS_DIR, imagenAnterior);
            if (fs.existsSync(rutaAnterior)) {
                fs.unlinkSync(rutaAnterior);
            }
        }

        const nuevoNombre = req.file.filename;
        const resultado = await actualizarImagenUsuario(userId, nuevoNombre);

        if (!resultado.ok) {
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ ok: false, message: "error al actualizar en BD" });
        }

        return res.json({
            ok: true,
            message: "imagen actualizada",
            imagen: nuevoNombre
        });

    } catch (error) {
        console.error("❌ Error en /usuario/imagen:", error);
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        return res.status(500).json({ ok: false, message: "error interno al subir la imagen" });
    }
});

app.get("/usuarios", verificarToken, esAdmin, async (req, res) => {
    try {
        const datos = await usuarios()
        if (!datos.ok) {
            return res.status(500).json({ ok: false, message: datos.message })
        }
        return res.json({ ok: true, usuarios: datos.usuarios })

    } catch (error) {
        console.error(" Error en /usuarios:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener usuarios" });
    }
})

app.put("/usuario/:id", verificarToken, esAdmin, async (req, res) => {
    try {
        const id = req.params.id
        const { nombre, email, password, telefono, rol_id } = req.body
        if (!nombre || !email || !telefono || !rol_id) {
            return res.status(400).json({ ok: false, message: "falta información" })
        }
        const usuario = { id, nombre, email, password, telefono, rol_id: Number(rol_id) }
        const resultado = await editarUsuario(usuario)
        if (!resultado.ok) {
            return res.status(500).json({ ok: false, message: resultado.message })
        }
        return res.json({ ok: true, message: "usuario actualizado" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ ok: false, message: "error interno al actualizar usuario" })
    }
})

app.get("/roles", verificarToken, esAdmin, async (req, res) => {
    try {
        const resultados = await obtenerRoles()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json({ ok: true, roles: resultados.roles })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ ok: false, message: "error interno al obtener roles" })
    }
})

app.post("/agregarUsuario", verificarToken, esAdmin, async (req, res) => {
    try {
        const { nombre, email, password, telefono, rol_id } = req.body
        if (!nombre || !email || !password || !telefono || !rol_id) {
            return res.status(400).json({ ok: false, message: "falta información" })
        }
        const usuario = { nombre, email, password, telefono, rol_id: Number(rol_id) }
        const resultado = await agregarUsuario(usuario)
        if (!resultado.ok) {
            return res.status(500).json({ ok: false, message: resultado.message })
        }
        return res.json({ ok: true, message: "usuario agregado" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ ok: false, message: "error interno al agregar usuario" })
    }
})

app.delete("/eliminarUsuario/:id", verificarToken, esAdmin, async (req, res) => {
    try {
        const id = req.params.id
        const resultado = await eliminarUsuario(id)
        if (!resultado.ok) {
            return res.status(404).json({ ok: false, message: resultado.message })
        }
        return res.json({ ok: true, message: "usuario eliminado" })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ ok: false, message: "error interno al eliminar usuario" })
    }
})

// ========== ENDPOINTS DE DASHBOARD, PRODUCTOS Y REPORTES ==========
app.get("/dashboard/resumen", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerResumenDashboard()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.resumen)
    } catch (error) {
        console.error(" Error en /dashboard/resumen:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener resumen del dashboard" });
    }
})

app.get("/dashboard/productos-top", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerProductosTopDashboard()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.productos)
    } catch (error) {
        console.error(" Error en /dashboard/productos-top:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener productos top del dashboard" });
    }
})

app.get("/dashboard/categorias", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerCategoriasDashboard()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.categorias)
    } catch (error) {
        console.error(" Error en /dashboard/categorias:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener categorías del dashboard" });
    }
})

app.get("/productos/metricas", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerMetricasProductos()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.metricas)
    } catch (error) {
        console.error(" Error en /productos/metricas:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener métricas de productos" });
    }
})

app.get("/productos/bajo-stock", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerProductosBajoStock()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.productos)
    } catch (error) {
        console.error(" Error en /productos/bajo-stock:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener productos con bajo stock" });
    }
})

app.get("/productos/top-vendidos", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerProductosTopVendidos()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.productos)
    } catch (error) {
        console.error(" Error en /productos/top-vendidos:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener productos más vendidos" });
    }
})

app.get("/productos/categorias", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerProductosCategorias()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.categorias)
    } catch (error) {
        console.error(" Error en /productos/categorias:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener productos por categoría" });
    }
})

app.get("/reportes/ventas", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerReporteVentas()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.ventas)
    } catch (error) {
        console.error(" Error en /reportes/ventas:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener reporte de ventas" });
    }
})

app.get("/reportes/pedidos", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerReportePedidos()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.pedidos)
    } catch (error) {
        console.error(" Error en /reportes/pedidos:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener reporte de pedidos" });
    }
})

app.get("/reportes/inventario", verificarToken, esUsuarioInterno, async (req, res) => {
    try {
        const resultados = await obtenerReporteInventario()
        if (!resultados.ok) {
            return res.status(500).json({ ok: false, message: resultados.message })
        }
        return res.json(resultados.inventario)
    } catch (error) {
        console.error(" Error en /reportes/inventario:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener reporte de inventario" });
    }
})

// ========== INICIAR SERVIDOR ==========
app.listen(puerto, () => {
    console.log(`Servidor corriendo en http://localhost:${puerto}`);
});
