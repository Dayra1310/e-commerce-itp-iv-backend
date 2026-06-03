import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { usuarios, direcciones } from './client.schema.js';
import type { Address } from './client.types.js';

export const getUserById = async (id: number) => {
  const result = await db.select({
    id: usuarios.id,
    nombre: usuarios.nombre,
    email: usuarios.email,
    telefono: usuarios.telefono,
    fechaRegistro: usuarios.fechaRegistro,
    rolId: usuarios.rolId,
  }).from(usuarios).where(eq(usuarios.id, id));
  
  return result[0];
};

export const getUserAddresses = async (userId: number): Promise<Address[]> => {
  const result = await db.select({
    id: direcciones.id,
    direccion: direcciones.direccion,
    ciudad: direcciones.ciudad,
    pais: direcciones.pais,
  }).from(direcciones).where(eq(direcciones.usuarioId, userId));
  
  return result as Address[];
};

export const updateUser = async (id: number, data: { nombre?: string; telefono?: string }) => {
  await db.update(usuarios).set(data).where(eq(usuarios.id, id));
};
