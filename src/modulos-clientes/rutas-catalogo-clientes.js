import {
    listarCategoriasCatalogo,
    listarProductosCatalogo,
    obtenerProductoCatalogoPorId
} from "./repositorio-catalogo-clientes.js";
import {
    responderErrorClientes,
    responderExitoClientes
} from "./respuestas-clientes.js";

export default function registrarRutasCatalogoClientes(app) {
    app.get("/catalog/products", async (req, res) => {
        try {
            const productos = await listarProductosCatalogo({ categoriaId: req.query.category });
            return responderExitoClientes(res, {
                productos,
                data: productos
            });
        } catch (error) {
            console.error("Error al obtener productos del catálogo:", error);
            return responderErrorClientes(res, "Error al obtener los productos", 500);
        }
    });

    app.get("/catalog/categories", async (req, res) => {
        try {
            const categorias = await listarCategoriasCatalogo();
            return responderExitoClientes(res, {
                categorias,
                data: categorias
            });
        } catch (error) {
            console.error("Error al obtener categorías del catálogo:", error);
            return responderErrorClientes(res, "Error al obtener las categorías", 500);
        }
    });

    app.get("/catalog/products/categoria/:categoriaId", async (req, res) => {
        try {
            const productos = await listarProductosCatalogo({ categoriaId: req.params.categoriaId });
            return responderExitoClientes(res, {
                productos,
                data: productos
            });
        } catch (error) {
            console.error("Error al filtrar productos por categoría:", error);
            return responderErrorClientes(res, "Error al filtrar productos por categoría", 500);
        }
    });

    app.get("/catalog/products/:id", async (req, res) => {
        try {
            const producto = await obtenerProductoCatalogoPorId(req.params.id);

            if (!producto) {
                return responderErrorClientes(res, "Producto no encontrado", 404);
            }

            return responderExitoClientes(res, {
                producto,
                data: producto
            });
        } catch (error) {
            console.error("Error al obtener detalle del producto:", error);
            return responderErrorClientes(res, "Error al obtener el producto", 500);
        }
    });
}
