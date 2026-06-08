import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as service from './service.js';
import type { RegisterInput, LoginInput } from './types.js';

export const registerController = async (
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply
) => {
  try {
    const result = await service.register(request.body);
    return reply.code(201).send(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al registrar usuario';
    return reply.code(400).send({ error: message });
  }
};

export const loginController = async (
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply
) => {
  try {
    const result = await service.login(request.body);
    return reply.code(200).send(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
    return reply.code(401).send({ error: message });
  }
};

export const authRoutes = async (app: FastifyInstance) => {
  app.post('/auth/register', registerController);
  app.post('/auth/login', loginController);
};
