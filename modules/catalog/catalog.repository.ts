import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { productos, categorias } from './catalog.schema.js';
import type { Product, Category } from './catalog.types.js';

export const getProducts = async (): Promise<Product[]> => {
  const result = await db.select().from(productos);
  return result as Product[];
};

export const getProductById = async (id: number): Promise<Product | undefined> => {
  const result = await db.select().from(productos).where(eq(productos.id, id));
  return result[0] as Product | undefined;
};

export const getProductsByCategory = async (categoryId: number): Promise<Product[]> => {
  const result = await db.select().from(productos).where(eq(productos.categoriaId, categoryId));
  return result as Product[];
};

export const getCategories = async (): Promise<Category[]> => {
  const result = await db.select().from(categorias);
  return result as Category[];
};
