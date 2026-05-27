import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({
  path: path.join(__dirname, ".env"),
  override: true,
  quiet: true,
});

const obtenerVariableRequerida = (nombreVariable) => {
  const valor = process.env[nombreVariable];

  if (valor === undefined || String(valor).trim() === "") {
    throw new Error(`Falta configurar ${nombreVariable} en el archivo .env`);
  }

  return String(valor).trim();
};

const obtenerVariableOpcional = (nombreVariable, valorPorDefecto) => {
  const valor = process.env[nombreVariable];

  if (valor === undefined || String(valor).trim() === "") {
    return valorPorDefecto;
  }

  return String(valor).trim();
};

const obtenerNumeroOpcional = (nombreVariable, valorPorDefecto) => {
  const valorTexto = obtenerVariableOpcional(nombreVariable, String(valorPorDefecto));
  const numero = Number(valorTexto);

  if (!Number.isFinite(numero)) {
    throw new Error(`${nombreVariable} debe ser un número válido`);
  }

  return numero;
};

const configuracion = {
  servidor: {
    puerto: obtenerNumeroOpcional("APP_PORT", 3001),
    entorno: obtenerVariableOpcional("NODE_ENV", "development"),
    corsOrigenes: obtenerVariableOpcional(
      "CORS_ORIGINS",
      "http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:3000,http://localhost:3000"
    )
      .split(",")
      .map((origen) => origen.trim())
      .filter(Boolean),
  },
  baseDatos: {
    host: obtenerVariableRequerida("DB_HOST"),
    port: obtenerNumeroOpcional("DB_PORT", 3306),
    user: obtenerVariableRequerida("DB_USER"),
    password: obtenerVariableRequerida("DB_PASSWORD"),
    database: obtenerVariableRequerida("DB_NAME"),
    connectionLimit: obtenerNumeroOpcional("DB_CONNECTION_LIMIT", 10),
    queueLimit: 0,
  },
  seguridad: {
    jwtSecret: obtenerVariableRequerida("JWT_SECRET"),
    jwtExpiresIn: obtenerVariableOpcional("JWT_EXPIRES_IN", "1h"),
    bcryptSaltRounds: obtenerNumeroOpcional("BCRYPT_SALT_ROUNDS", 10),
  },
  archivos: {
    maxImageSizeBytes: obtenerNumeroOpcional("MAX_IMAGE_SIZE_BYTES", 5242880),
  },
};

export { configuracion };
