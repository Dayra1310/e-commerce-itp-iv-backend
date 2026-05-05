import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as service from './catalog.service.js';
import type { StandardResponse, Product, Category, ProductQuery } from './catalog.types.js';

export const getProductsController = async (
  request: FastifyRequest<{ Querystring: ProductQuery }>,
  reply: FastifyReply
) => {
  try {
    const products = await service.getAllProducts(request.query.category);
    const response: StandardResponse<Product[]> = { success: true, data: products };
    return reply.code(200).send(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener productos';
    const response: StandardResponse<null> = { success: false, error: message };
    return reply.code(400).send(response);
  }
};

export const getProductByIdController = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const product = await service.getProductDetails(request.params.id);
    const response: StandardResponse<Product> = { success: true, data: product };
    return reply.code(200).send(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener el producto';
    const response: StandardResponse<null> = { success: false, error: message };
    return reply.code(error instanceof Error && error.message === 'Producto no encontrado' ? 404 : 400).send(response);
  }
};

export const getCategoriesController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const categories = await service.getAllCategories();
    const response: StandardResponse<Category[]> = { success: true, data: categories };
    return reply.code(200).send(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener categorías';
    const response: StandardResponse<null> = { success: false, error: message };
    return reply.code(400).send(response);
  }
};

export const catalogRoutes = async (app: FastifyInstance) => {
  app.get('/products', getProductsController);
  app.get('/products/:id', getProductByIdController);
  app.get('/categories', getCategoriesController);
};
