// db.ts
import mysql from "mysql2/promise";

export async function conectar() {
    try {
        const conexion = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "EdwinBolanos20063006",
            database: "prueba",
            port: 3306
        });
        return conexion;
    } catch (error) {
        console.error("Error de conexión:", error);
        throw error;
    }
}