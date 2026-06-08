import { mysqlTable, serial, varchar, text, decimal, int, mysqlEnum } from 'drizzle-orm/mysql-core';

export const categorias = mysqlTable('categorias', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  descripcion: text('descripcion'),
  estado: mysqlEnum('estado', ['activo', 'inactivo']).default('activo'),
  categoriaPadreId: int('categoria_padre_id'),
});

export const productos = mysqlTable('productos', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 150 }).notNull(),
  descripcion: text('descripcion'),
  precio: decimal('precio', { precision: 10, scale: 2 }).notNull(),
  sku: varchar('sku', { length: 50 }).unique(),
  stock: int('stock').default(0),
  peso: decimal('peso', { precision: 10, scale: 2 }),
  tamano: varchar('tamano', { length: 50 }),
  estado: mysqlEnum('estado', ['activo', 'inactivo']).default('activo'),
  categoriaId: int('categoria_id'),
});
