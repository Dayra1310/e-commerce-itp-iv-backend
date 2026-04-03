// db.ts
import mysql from "mysql2/promise";

export async function conectar() {
    try {
        const conexion = await mysql.createConnection({});
        return conexion;
    } catch (error) {
        console.error("Error de conexión:", error);
        throw error;
    }
}