import type { FastifyInstance, FastifyReply } from 'fastify';
import * as service from './client.service.js';
import { verifyJwt } from './middlewares/auth.middleware.js';
import type { AuthRequest, StandardResponse, UserResponse, UpdateUserRequest } from './client.types.js';

export const getProfileController = async (
  request: AuthRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user!.userId;
    const profile = await service.getProfile(userId);
    const response: StandardResponse<UserResponse> = { success: true, data: profile };
    return reply.code(200).send(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener perfil';
    const response: StandardResponse<null> = { success: false, error: message };
    return reply.code(error instanceof Error && error.message === 'Usuario no encontrado' ? 404 : 400).send(response);
  }
};

export const updateProfileController = async (
  request: AuthRequest<{ Body: UpdateUserRequest }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.user!.userId;
    await service.updateProfile(userId, request.body);
    const response: StandardResponse<null> = { success: true };
    return reply.code(200).send(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al actualizar usuario';
    const response: StandardResponse<null> = { success: false, error: message };
    return reply.code(400).send(response);
  }
};

export const clientRoutes = async (app: FastifyInstance) => {
  app.get('/profile', { preHandler: [verifyJwt] }, getProfileController);
  app.put('/user', { preHandler: [verifyJwt] }, updateProfileController);
};
