import registrarRutasClientes from "./rutas-clientes.js";
import registrarRutasCatalogoClientes from "./rutas-catalogo-clientes.js";

export default function registrarModuloClientes(app) {
    registrarRutasClientes(app);
    registrarRutasCatalogoClientes(app);
    console.log("Módulo integrado de clientes y catálogo inicializado");
}
