import mysql from "mysql2/promise"
import bcrypt from "bcrypt"

const config = {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
}

const conexion = await mysql.createConnection(config)

// LOGIN USUARIO
const loginUsuario = async (email, password) => {

    try {

        const [usuario] = await conexion.query(
            `SELECT
                u.id,
                u.password,
                u.rol_id,
                r.nombre AS nombre_rol
            FROM usuarios u
            JOIN roles r
                ON u.rol_id = r.id
            WHERE u.email = ?`,
            [email]
        )

        if (usuario.length === 0) {

            return {
                ok: false,
                message: "el usuario no existe"
            }

        }

        const datos = usuario[0]

        // ================= COMPARAR PASSWORD =================
        const passwordCorrecta = await bcrypt.compare(
            password,
            datos.password
        )

        if (!passwordCorrecta) {

            return {
                ok: false,
                message: "usuario o contraseña incorrectos"
            }

        }

        return {
            ok: true,
            id: datos.id,
            rol: datos.rol_id,
            nombre_rol: datos.nombre_rol
        }

    } catch (error) {

        console.log(error)

        return {
            ok: false,
            message: "error en el servidor"
        }

    }

}
const obtenerImagenUsuario = async (id) => {
    try {
        const [rows] = await conexion.query(
            "SELECT imagen_usuario_url FROM usuarios WHERE id = ?", 
            [id]
        );
        return rows[0] || null;  // null si no existe
    } catch (error) {
        console.log(error);
        return null;
    }
}

const actualizarImagenUsuario = async (id, url) => {
    try {
        await conexion.query("UPDATE usuarios SET imagen_usuario_url = ? WHERE id = ?", [url, id])
        return {ok: true}
    } catch (error) {
        console.log(error)
        return {ok:false}
    }
}

const obtenerPerfil = async (id) => {
    try {
        const [usuario] = await conexion.query(
            `SELECT u.nombre, u.imagen_usuario_url,
            r.nombre AS nombre_rol
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.id = ?`,
            [id]
        )

        return usuario[0]

    } catch (error) {
        console.log(error)
        return null
    }
}

const usuarios = async () => {
    try {
        const [usuario] = await conexion.query(`SELECT e.id, e.nombre, e.email, e.telefono, e.rol_id, r.nombre AS nombre_rol
                        FROM usuarios e JOIN roles r ON e.rol_id = r.id WHERE r.nombre != 'cliente'` )
        if(usuario.length === 0){
            return {ok:true, usuarios: []}
        }
        return {ok:true, usuarios: usuario};
    } catch (error) {
        console.log(error)
        return {ok:false, message:"error en la consulta"}
    }
}

const editarUsuario = async (usuario) => {
    try {
        let query = "UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, rol_id = ?"
        let valores = [usuario.nombre, usuario.email, usuario.telefono, usuario.rol_id]
        if (usuario.password) {
            const passwordHash = await bcrypt.hash(usuario.password, 10)
            query += ", password = ?"
            valores.push(passwordHash)
        }
        query += " WHERE id = ?"
        valores.push(usuario.id)
        const [resultados] = await conexion.query(query, valores)
        if(resultados.affectedRows === 0){
            return {ok:false, message:"usuario no encontrado"}
        }
        return {ok:true, message:"usuario actualizado"}
    } catch (error) {
        console.log(error)
        return {ok:false, message:"error en la consulta"}
    }
}

const agregarUsuario = async (usuario) => {
    try {
        const [existe] = await conexion.query("SELECT id FROM usuarios WHERE email = ?", [usuario.email])
        if(existe.length > 0){
            return {ok:false, message:"ya existe un usuario con ese email"}
        }
        const passwordHash = await bcrypt.hash(usuario.password, 10)
        const imagenDedault = "default.jpg"
        const [resultados] = await conexion.query(`INSERT INTO usuarios
             (nombre, email, password, telefono, rol_id, imagen_usuario_url)
              VALUES (?, ?, ?, ?, ?, ?)`,
              [usuario.nombre, usuario.email, passwordHash, usuario.telefono, usuario.rol_id, imagenDedault])
        
        return {ok:true, message:"usuario agregado"}
    } catch (error) {
        console.log(error)
        return {ok:false, message:"error en la consulta"}
    }
}


const obtenerRoles = async () =>{
    try {
        const [roles] = await conexion.query("SELECT id, nombre FROM roles WHERE nombre != 'cliente'")
        return {ok:true, roles: roles}
    } catch (error) {
        console.log(error)
        return {ok:false, message:"error al obtener roles"}
    }
}

const eliminarUsuario = async (id) => {
    try {
        const [resultados] = await conexion.query(`DELETE FROM usuarios WHERE id = ?`, [id])
        if(resultados.affectedRows === 0){
            return {ok:false, message:"usuario no encontrado"}
        }
        return {ok:true, message:"usuario eliminado"}
    } catch (error) {
        console.log(error)
        return {ok:false, message:"error al eliminar usuario"}
    }
}

// exportaciones 
export{
    loginUsuario,
    obtenerImagenUsuario,
    actualizarImagenUsuario,
    obtenerPerfil,
    usuarios,
    editarUsuario,
    obtenerRoles,
    agregarUsuario,
    eliminarUsuario
}