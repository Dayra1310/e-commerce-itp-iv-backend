import { conexion } from "../../db.js";

// Obtener todas las categorías
export const obtenerCategorias = async (req, res) => {
  try {
    const [categorias] = await conexion.query("SELECT * FROM categorias ORDER BY id ASC");
    res.json({ ok: true, categorias });
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener categorías" });
  }
};

// Obtener todos los productos (con nombre de categoría)
export const obtenerProductos = async (req, res) => {
  try {
    const [productos] = await conexion.query(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.id ASC
    `);
    res.json({ ok: true, productos });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener productos" });
  }
};

// Obtener productos por categoría
export const obtenerProductosPorCategoria = async (req, res) => {
  try {
    const { categoriaId } = req.params;
    const [productos] = await conexion.query(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.categoria_id = ?
       ORDER BY p.id ASC`,
      [categoriaId]
    );
    res.json({ ok: true, productos });
  } catch (error) {
    console.error("Error al obtener productos por categoría:", error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener productos por categoría" });
  }
};

// Obtener un solo producto por ID
export const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [productos] = await conexion.query(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    if (productos.length === 0) {
      return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    }
    res.json({ ok: true, producto: productos[0] });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener producto" });
  }
};

// Buscar productos por nombre
export const buscarProductos = async (req, res) => {
  try {
    const { q } = req.query;
    const termino = `%${q}%`;
    const [productos] = await conexion.query(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.nombre LIKE ? OR p.descripcion LIKE ?
       ORDER BY p.id ASC`,
      [termino, termino]
    );
    res.json({ ok: true, productos });
  } catch (error) {
    console.error("Error al buscar productos:", error);
    res.status(500).json({ ok: false, mensaje: "Error al buscar productos" });
  }
};
