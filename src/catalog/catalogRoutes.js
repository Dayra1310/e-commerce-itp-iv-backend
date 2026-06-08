import express from "express";
import {
  obtenerCategorias,
  obtenerProductos,
  obtenerProductosPorCategoria,
  obtenerProductoPorId,
  buscarProductos
} from "./catalogController.js";

const router = express.Router();

// Categorías
router.get("/categorias", obtenerCategorias);

// Productos
router.get("/productos", obtenerProductos);
router.get("/productos/buscar", buscarProductos);
router.get("/productos/categoria/:categoriaId", obtenerProductosPorCategoria);
router.get("/productos/:id", obtenerProductoPorId);

export default router;
