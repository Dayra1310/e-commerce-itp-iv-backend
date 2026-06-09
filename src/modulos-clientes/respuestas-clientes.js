export const responderExitoClientes = (res, datos = {}, estado = 200) => {
    const respuesta = {
        ok: true,
        success: true,
        ...datos
    };

    if (datos.data === undefined && datos.cliente !== undefined) {
        respuesta.data = datos.cliente;
    }

    return res.status(estado).json(respuesta);
};

export const responderErrorClientes = (res, message, estado = 400) => {
    return res.status(estado).json({
        ok: false,
        success: false,
        message,
        error: message
    });
};
