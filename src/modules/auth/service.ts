import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import * as repo from './repository.js';
import type { RegisterInput, LoginInput, AuthResponse } from './types.js';
import { config } from '../../config/index.js';

const SALT_ROUNDS = 10;

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const existingUser = await repo.findUserByEmail(input.email);
  if (existingUser) {
    throw new Error('El email ya está registrado');
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
  
  const newUser = await repo.createUser({
    name: input.name,
    email: input.email,
    phone: input.phone,
    password: hashedPassword,
  });

  const token = jwt.sign(
    { userId: newUser.id, email: newUser.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as SignOptions
  );

  return {
    token,
    user: {
      id: newUser.id,
      name: input.name,
      email: input.email,
      phone: input.phone,
    },
  };
};

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const userWithPassword = await repo.getUserPassword(input.email);
  if (!userWithPassword) {
    throw new Error('Credenciales inválidas');
  }

  const isValidPassword = await bcrypt.compare(input.password, userWithPassword.password);
  if (!isValidPassword) {
    throw new Error('Credenciales inválidas');
  }

  const user = await repo.findUserById(userWithPassword.id);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as SignOptions
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  };
};
