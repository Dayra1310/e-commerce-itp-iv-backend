
import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config';
import { authRoutes } from './modules/auth/controller.js';
import cors from '@fastify/cors';
import { catalogRoutes } from './modules/catalog/catalog.controller.js';
import { clientRoutes } from './modules/client/client.controller.js';

const fastify: FastifyInstance = Fastify({
  logger: true
});

fastify.get('/health', async (_request, _reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.register(cors, {
  origin: '*'
});

const start = async (): Promise<void> => {
  try {
    await fastify.register(authRoutes);
    
    // Las rutas DEBEN registrarse antes de inicializar el servidor con listen()
    await fastify.register(catalogRoutes, { prefix: '/catalog' });
    await fastify.register(clientRoutes, { prefix: '/client' });

    await fastify.listen({ port: config.app.port });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
