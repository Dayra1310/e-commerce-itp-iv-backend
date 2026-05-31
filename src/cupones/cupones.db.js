const cuponesQuemados = [
    { id: 1, nombre: "Descuento 10%", codigo: "DESC10", porcentaje_descuento: 10.00, estado: "activo" },
    { id: 2, nombre: "Descuento 50%", codigo: "DESC50", porcentaje_descuento: 50.00, estado: "activo" }
];

const obtenerCupones = async () => {
    return { ok: true, cupones: cuponesQuemados };
};

const validarCupon = async (codigo) => {
    const cupon = cuponesQuemados.find(
        (c) => c.codigo === String(codigo).toUpperCase().trim() && c.estado === "activo"
    );

    if (!cupon) {
        return { ok: false, message: "cupón no válido o inexistente" };
    }

    return {
        ok: true,
        cupon: {
            id: cupon.id,
            nombre: cupon.nombre,
            codigo: cupon.codigo,
            porcentaje_descuento: cupon.porcentaje_descuento
        }
    };
};

export { obtenerCupones, validarCupon };
