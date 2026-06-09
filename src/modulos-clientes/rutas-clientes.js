import {
    actualizarPerfilCliente,
    cambiarPasswordCliente,
    listarClientes,
    obtenerPerfilCliente,
    registrarCliente
} from "./repositorio-clientes.js";
import {
    responderErrorClientes,
    responderExitoClientes
} from "./respuestas-clientes.js";
import {
    verificarAdministradorClientes,
    verificarTokenClientes
} from "./seguridad-clientes.js";

const construirRespuestaPerfil = (perfil) => ({
    id: perfil.id,
    nombre: perfil.nombre,
    name: perfil.nombre,
    email: perfil.email,
    telefono: perfil.telefono,
    phone: perfil.telefono,
    rol: perfil.nombre_rol,
    rol_id: perfil.rol_id,
    imagen: perfil.imagen_usuario_url,
    fechaRegistro: perfil.fecha_registro,
    createdAt: perfil.fecha_registro
});

export default function registrarRutasClientes(app) {
    const registrar = async (req, res) => {
        try {
            const resultado = await registrarCliente(req.body || {});

            if (!resultado.ok) {
                return responderErrorClientes(res, resultado.message, 400);
            }

            return responderExitoClientes(
                res,
                {
                    message: resultado.message
                },
                201
            );
        } catch (error) {
            console.error("Error en registro de cliente:", error);
            return responderErrorClientes(res, "Error interno del servidor al registrar cliente", 500);
        }
    };

    app.post("/clientes/registro", registrar);
    app.post("/auth/register", registrar);
    app.post("/auth/registro", registrar);

    app.get("/client/profile", verificarTokenClientes, async (req, res) => {
        try {
            const perfil = await obtenerPerfilCliente(req.usuario.id);

            if (!perfil) {
                return responderErrorClientes(res, "Usuario no encontrado", 404);
            }

            const perfilRespuesta = construirRespuestaPerfil(perfil);

            return responderExitoClientes(res, {
                ...perfilRespuesta,
                data: perfilRespuesta
            });
        } catch (error) {
            console.error("Error al obtener perfil del cliente:", error);
            return responderErrorClientes(res, "Error al obtener el perfil", 500);
        }
    });

    app.put("/client/profile", verificarTokenClientes, async (req, res) => {
        try {
            const resultado = await actualizarPerfilCliente(req.usuario.id, req.body || {});

            if (!resultado.ok) {
                return responderErrorClientes(res, resultado.message, 400);
            }

            return responderExitoClientes(res, { message: resultado.message });
        } catch (error) {
            console.error("Error al actualizar perfil del cliente:", error);
            return responderErrorClientes(res, "Error al actualizar el perfil", 500);
        }
    });

    app.put("/client/user", verificarTokenClientes, async (req, res) => {
        try {
            const resultado = await actualizarPerfilCliente(req.usuario.id, req.body || {});

            if (!resultado.ok) {
                return responderErrorClientes(res, resultado.message, 400);
            }

            return responderExitoClientes(res, { message: resultado.message });
        } catch (error) {
            console.error("Error al actualizar usuario cliente:", error);
            return responderErrorClientes(res, "Error al actualizar el perfil", 500);
        }
    });

    app.put("/client/password", verificarTokenClientes, async (req, res) => {
        try {
            const resultado = await cambiarPasswordCliente(req.usuario.id, req.body || {});

            if (!resultado.ok) {
                return responderErrorClientes(res, resultado.message, 400);
            }

            return responderExitoClientes(res, { message: resultado.message });
        } catch (error) {
            console.error("Error al cambiar contraseña del cliente:", error);
            return responderErrorClientes(res, "Error al cambiar la contraseña", 500);
        }
    });

    app.get("/clientes/listado", verificarTokenClientes, verificarAdministradorClientes, async (req, res) => {
        try {
            const clientes = await listarClientes();
            return responderExitoClientes(res, {
                clientes,
                data: clientes
            });
        } catch (error) {
            console.error("Error al listar clientes:", error);
            return responderErrorClientes(res, "Error al listar clientes", 500);
        }
    });
}
