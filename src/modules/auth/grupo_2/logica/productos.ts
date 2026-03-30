const API_URL = "http://localhost:5500/api/productos";

export async function obtenerProductos() {
    try {
        const token = localStorage.getItem("token");

        if (!token) {
            throw new Error("No hay token, inicia sesión");
        }

        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }
        });


        const data: unknown = await response.json();

        if (!response.ok) {
            // Verifica si data es un objeto y tiene la propiedad mensaje
            const mensaje = (typeof data === "object" && data !== null && "mensaje" in data)
                ? (data as any).mensaje
                : undefined;
            throw new Error(mensaje || "Error al obtener productos");
        }

        // Verifica si data es un objeto y tiene la propiedad productos
        if (typeof data === "object" && data !== null && "productos" in data) {
            return (data as any).productos;
        }
        // Si no tiene la propiedad productos, retorna array vacío
        return [];

    } catch (error: any) {
        console.error("Error:", error.message);
        return [];
    }
}