
import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config';
import { authRoutes } from './modules/auth/controller.js';
import cors from '@fastify/cors';

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
    await fastify.listen({ port: config.app.port });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
