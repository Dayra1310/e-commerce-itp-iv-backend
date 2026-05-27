import dotenv from 'dotenv';
dotenv.config();
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
    eliminarUsuario
} from "./db.js";


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

app.use(cors({
    origin: true,
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
                id: resultados.id
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
    if (req.usuario.nombre_rol.toLowerCase() !== "administrador") {
        return res.status(403).json({ ok: false, message: "acceso denegado" });
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
            try { fs.unlinkSync(req.file.path); } catch(e) {}
        }
        return res.status(500).json({ ok: false, message: "error interno al subir la imagen" });
    }
});

app.get("/usuarios", verificarToken, esAdmin, async (req, res) => {
    try {
        const datos = await usuarios()
        if(!datos.ok){
            return res.status(500).json({ok:false, message:datos.message})
        }
        return res.json({ok:true, usuarios: datos.usuarios})

    } catch (error) {
        console.error(" Error en /usuarios:", error);
        return res.status(500).json({ ok: false, message: "error interno al obtener usuarios" });
    }
})

app.put("/usuario/:id", verificarToken, esAdmin, async (req, res) => {
    try {
        const id = req.params.id
        const {nombre, email, password, telefono, rol_id} = req.body
        if(!nombre || !email || !telefono || !rol_id){
            return res.status(400).json({ok:false, message:"falta información"})
        }
        const usuario = {id, nombre, email, password, telefono, rol_id}
        const resultado = await editarUsuario(usuario)
        if(!resultado.ok){
            return res.status(500).json({ok:false, message:resultado.message})
        }
        return res.json({ok:true, message:"usuario actualizado"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ok:false, message:"error interno al actualizar usuario"})
    }

})

app.get("/roles", verificarToken, esAdmin, async (req, res) => {
    try {
        const resultados = await obtenerRoles()
        if(!resultados.ok){
            return res.status(500).json({ok:false, message:resultados.message})
        }
        return res.json({ok:true, roles: resultados.roles})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ok:false, message:"error interno al obtener roles"})
    }
})

app.post("/agregarUsuario", verificarToken, esAdmin, async (req, res) => {
    try {
        const {nombre, email, password, telefono, rol_id} = req.body
        if(!nombre || !email || !password || !telefono || !rol_id){
            return res.status(400).json({ok:false, message:"falta información"})
        }
        const usuario = {nombre, email, password, telefono, rol_id}
        const resultado = await agregarUsuario(usuario)
        if(!resultado.ok){
            return res.status(500).json({ok:false, message:resultado.message})
        }
        return res.json({ok:true, message:"usuario agregado"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ok:false, message:"error interno al agregar usuario"})
    }
})

app.delete("/eliminarUsuario/:id", verificarToken, esAdmin, async (req, res) => {
    try {
        const id = req.params.id
        const resultado = await eliminarUsuario(id)
        if(!resultado.ok){
            return res.status(404).json({ok:false, message:resultado.message})
        }
        return res.json({ok:true, message:"usuario eliminado"})
        
    } catch (error) {
        console.log(error)
        return res.status(500).json({ok:false, message:"error interno al eliminar usuario"})
    }
})

// ========== INICIAR SERVIDOR ==========
app.listen(puerto, () => {
    console.log(`Servidor corriendo en http://localhost:${puerto}`);
});