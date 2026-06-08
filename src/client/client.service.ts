import * as repo from './client.repository.js';
import type { UserResponse, UpdateUserRequest } from './client.types.js';

export const getProfile = async (userId: number): Promise<UserResponse> => {
  const user = await repo.getUserById(userId);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const addresses = await repo.getUserAddresses(userId);

  return {
    ...user,
    direcciones: addresses,
  };
};

export const updateProfile = async (userId: number, input: UpdateUserRequest): Promise<void> => {
  // Only allow updatable fields
  const dataToUpdate: { nombre?: string; telefono?: string } = {};
  
  if (input.nombre !== undefined) dataToUpdate.nombre = input.nombre;
  if (input.telefono !== undefined) dataToUpdate.telefono = input.telefono;

  if (Object.keys(dataToUpdate).length === 0) {
    throw new Error('No hay campos válidos para actualizar');
  }

  await repo.updateUser(userId, dataToUpdate);
};
