import { FastifyRequest } from 'fastify';

export interface Address {
  id: number;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
}

export interface UserResponse {
  id: number;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  fechaRegistro: Date | null;
  rolId: number | null;
  direcciones: Address[];
}

export interface UpdateUserRequest {
  nombre?: string;
  telefono?: string;
}

export interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthRequest<Body = any, Querystring = any, Params = any> extends FastifyRequest<{ Body: Body, Querystring: Querystring, Params: Params }> {
  user?: {
    userId: number;
    email: string;
  };
}
