import 'dotenv/config';

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface AppConfig {
  port: number;
}

interface Config {
  db: DbConfig;
  app: AppConfig;
}

export const config: Config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce',
  },
  app: {
    port: parseInt(process.env.PORT || '4200', 10),
  },
};
