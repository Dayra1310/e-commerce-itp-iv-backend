import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'ecommerce',
  waitForConnections: true,
  connectionLimit: 10,
});

export const db = drizzle(pool);
