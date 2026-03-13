import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import type { UserWithoutPassword } from './types.js';

export const findUserByEmail = async (email: string): Promise<UserWithoutPassword | undefined> => {
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    password: users.password,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users).where(eq(users.email, email));
  
  return result[0] as UserWithoutPassword | undefined;
};

export const findUserById = async (id: number): Promise<UserWithoutPassword | undefined> => {
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users).where(eq(users.id, id));
  
  return result[0];
};

export const createUser = async (data: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ id: number; email: string }> => {
  const result = await db.insert(users).values(data);
  const insertId = result[0].insertId;
  return { id: Number(insertId), email: data.email };
};

export const getUserPassword = async (email: string): Promise<{ id: number; password: string } | undefined> => {
  const result = await db.select({
    id: users.id,
    password: users.password,
  }).from(users).where(eq(users.email, email));
  
  return result[0];
};
