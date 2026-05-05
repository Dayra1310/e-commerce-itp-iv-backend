import { mysqlTable, serial, varchar, text, int, timestamp } from 'drizzle-orm/mysql-core';

export const roles = mysqlTable('roles', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 50 }).notNull().unique(),
  descripcion: varchar('descripcion', { length: 255 }),
});

export const usuarios = mysqlTable('usuarios', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }),
  email: varchar('email', { length: 100 }).unique(),
  password: varchar('password', { length: 255 }),
  telefono: varchar('telefono', { length: 20 }),
  fechaRegistro: timestamp('fecha_registro').defaultNow(),
  rolId: int('rol_id'),
});

export const direcciones = mysqlTable('direcciones', {
  id: serial('id').primaryKey(),
  usuarioId: int('usuario_id'),
  direccion: text('direccion'),
  ciudad: varchar('ciudad', { length: 100 }),
  pais: varchar('pais', { length: 100 }),
});
