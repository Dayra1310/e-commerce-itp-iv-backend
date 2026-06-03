import type { FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/index.js';
import type { AuthRequest } from '../client.types.js';

export const verifyJwt = async (request: AuthRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ success: false, error: 'Token no proporcionado o formato inválido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: number; email: string };
    
    // Attach user to request
    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({ success: false, error: 'Token expirado o inválido' });
  }
};
