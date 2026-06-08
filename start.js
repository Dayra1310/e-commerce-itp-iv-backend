// ============================================================
// start.js — Arranca TODO el proyecto
//
// ORDEN DE INICIALIZACION:
//   1. start.js arranca
//   2. index.js se inicializa (todo lo de los demas)
//   3. catalogoClientes.js se inicializa (nuestro modulo)
//   4. Se inicia el servidor
//
// En package.json cambiar:
//   "main": "start.js"
//   "dev": "nodemon start.js"
// ============================================================

// ========== 2. INICIAR INDEX.JS (todo lo de los demas) ==========
import { app, puerto } from "./index.js";

// ========== 3. INICIAR NUESTRO MODULO (Catalogo, Clientes, Registro) ==========
import catalogoClientes from "./catalogoClientes.js";
catalogoClientes(app);

// ========== 4. INICIAR SERVIDOR ==========
app.listen(puerto, () => {
    console.log(`Servidor corriendo en http://localhost:${puerto}`);
    console.log("Modulos activos: Original + Catalogo/Clientes/Registro");
});
