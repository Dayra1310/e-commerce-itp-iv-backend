import jwt from "jsonwebtoken";

export const verificarTokenClientes = (req, res, next) => {
    const token = req.cookies?.access_token;

    if (!token) {
        return res.status(401).json({
            ok: false,
            success: false,
            message: "no autenticado",
            error: "no autenticado"
        });
    }

    try {
        const datosToken = jwt.verify(token, process.env.SECRET_KEY);
        req.usuario = datosToken;
        next();
    } catch (error) {
        return res.status(403).json({
            ok: false,
            success: false,
            message: "token no válido",
            error: "token no válido"
        });
    }
};

export const verificarAdministradorClientes = (req, res, next) => {
    const nombreRol = String(req.usuario?.nombre_rol || "").trim().toLowerCase();

    if (nombreRol !== "administrador") {
        return res.status(403).json({
            ok: false,
            success: false,
            message: "acceso denegado",
            error: "acceso denegado"
        });
    }

    next();
};
