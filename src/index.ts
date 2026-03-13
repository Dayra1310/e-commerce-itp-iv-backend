
import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config';

const fastify: FastifyInstance = Fastify({
  logger: true
});

fastify.get('/health', async (_request, _reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async (): Promise<void> => {
  try {
    await fastify.listen({ port: config.app.port});
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
