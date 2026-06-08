import * as repo from './catalog.repository.js';
import type { Product, Category } from './catalog.types.js';

export const getAllProducts = async (categoryId?: string): Promise<Product[]> => {
  if (categoryId) {
    const parsedId = parseInt(categoryId, 10);
    if (isNaN(parsedId)) {
      throw new Error('ID de categoría inválido');
    }
    return await repo.getProductsByCategory(parsedId);
  }
  return await repo.getProducts();
};

export const getProductDetails = async (id: string): Promise<Product> => {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    throw new Error('ID de producto inválido');
  }

  const product = await repo.getProductById(parsedId);
  if (!product) {
    throw new Error('Producto no encontrado');
  }

  return product;
};

export const getAllCategories = async (): Promise<Category[]> => {
  return await repo.getCategories();
};
