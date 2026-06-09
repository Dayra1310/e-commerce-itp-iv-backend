import {
    conexionClientes,
    normalizarIdClientes
} from "./conexion-clientes.js";

const normalizarProductoCatalogo = (producto) => ({
    ...producto,
    categoriaId: producto.categoria_id,
    categoriaNombre: producto.categoria_nombre,
    tamano: producto.tamano || producto.tamaño || null,
    imagen: producto.imagen || producto.imagen_url || null
});

const normalizarCategoriaCatalogo = (categoria) => ({
    ...categoria,
    categoriaPadreId: categoria.categoria_padre_id ?? null
});

export const listarProductosCatalogo = async ({ categoriaId } = {}) => {
    const parametros = [];
    let filtroCategoria = "";

    if (categoriaId) {
        filtroCategoria = " AND p.categoria_id = ?";
        parametros.push(normalizarIdClientes(categoriaId));
    }

    const [productos] = await conexionClientes.query(
        `SELECT
            p.*,
            c.nombre AS categoria_nombre
         FROM productos p
         LEFT JOIN categorias c
            ON p.categoria_id = c.id
         WHERE (p.estado IS NULL OR LOWER(TRIM(CAST(p.estado AS CHAR))) IN ('activo', '1', 'true', 'disponible'))
         ${filtroCategoria}
         ORDER BY p.id DESC`,
        parametros
    );

    return productos.map(normalizarProductoCatalogo);
};

export const listarCategoriasCatalogo = async () => {
    const [categorias] = await conexionClientes.query(
        `SELECT *
         FROM categorias
         WHERE (estado IS NULL OR LOWER(TRIM(CAST(estado AS CHAR))) IN ('activo', '1', 'true', 'disponible'))
         ORDER BY nombre ASC`
    );

    return categorias.map(normalizarCategoriaCatalogo);
};

export const obtenerProductoCatalogoPorId = async (idProducto) => {
    const [productos] = await conexionClientes.query(
        `SELECT
            p.*,
            c.nombre AS categoria_nombre
         FROM productos p
         LEFT JOIN categorias c
            ON p.categoria_id = c.id
         WHERE p.id = ?
         LIMIT 1`,
        [normalizarIdClientes(idProducto)]
    );

    return productos[0] ? normalizarProductoCatalogo(productos[0]) : null;
};
