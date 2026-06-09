import dotenv from "dotenv";
dotenv.config({ override: true });

import mysql from "mysql2/promise";

const obtenerVariableEntorno = (...nombres) => {
    for (const nombre of nombres) {
        const valor = process.env[nombre];
        if (valor !== undefined && String(valor).trim() !== "") {
            return String(valor).trim();
        }
    }
    return "";
};

const obtenerNumeroEntorno = (valor, valorPorDefecto) => {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : valorPorDefecto;
};

const configuracionConexionClientes = {
    host: obtenerVariableEntorno("DB_HOST", "HOST") || "localhost",
    port: obtenerNumeroEntorno(obtenerVariableEntorno("DB_PORT", "PORT_DB"), 3306),
    user: obtenerVariableEntorno("DB_USER", "USER") || "root",
    password: obtenerVariableEntorno("DB_PASSWORD", "PASSWORD"),
    database: obtenerVariableEntorno("DB_NAME", "DATABASE") || "ecommerce_tableros",
    waitForConnections: true,
    connectionLimit: obtenerNumeroEntorno(obtenerVariableEntorno("DB_CONNECTION_LIMIT"), 10),
    queueLimit: 0
};

export const conexionClientes = mysql.createPool(configuracionConexionClientes);

export const normalizarTextoClientes = (valor) => String(valor ?? "").trim();
export const normalizarCorreoClientes = (valor) => normalizarTextoClientes(valor).toLowerCase();
export const normalizarIdClientes = (valor) => Number(valor);
export const normalizarNumeroClientes = (valor) => Number(valor ?? 0);
