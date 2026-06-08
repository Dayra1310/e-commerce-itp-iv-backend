# ShopITP - Backend (baken/)

## Qué es

Backend de ShopITP, e-commerce de tableros y madera. Corre en **Express 5 + MySQL** con autenticación JWT (cookies httpOnly).

## Requisitos

- **Node.js** 18+
- **MySQL** 8.0+ (XAMPP o instalación directa)
- Base de datos `ecommerce_tableros_02` importada (ver SQL en el repositorio)

## Cómo iniciar

```bash
# 1. Entrar a la carpeta del backend
cd backend

# 2. Instalar dependencias (solo la primera vez)
npm install

# 3. Crear archivo .env (ver sección abajo)

# 4. Iniciar el servidor
npm run dev
```

El servidor arranca en **http://localhost:3001**

Si todo sale bien verás:
```
Servidor corriendo en http://localhost:3001
```

## Archivo .env

Crear un archivo `.env` en la raíz de `baken/` con esto (ajustar valores):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_de_mysql
DB_NAME=ecommerce_tableros_02
SECRET_KEY=shopitp_secret_key_2026
```

> Si usas XAMPP con MySQL sin password, deja `DB_PASSWORD=` vacío.

## Base de datos

1. Abrir **phpMyAdmin** o MySQL Workbench
2. Crear la base: `CREATE DATABASE ecommerce_tableros_02;`
3. Importar el archivo SQL (`E-commerce_02.sql` o `E-commerce_03.sql`)
4. Verificar que existen las tablas: `usuarios`, `roles`, `productos`, `categorias`, `pedidos`, `carrito`, etc.


## Rutas de la API

### Auth (de index.js)
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/login` | Iniciar sesión (devuelve cookie JWT) | No |
| POST | `/logout` | Cerrar sesión | No |
| GET | `/perfil` | Obtener perfil básico | Sí (cookie) |

### Catálogo y Clientes (de catalogoClientes.js)
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/registro` | Registrar nuevo cliente | No |
| GET | `/catalog/categories` | Listar categorías activas | No |
| GET | `/catalog/products` | Listar productos activos | No |
| GET | `/catalog/products/:id` | Detalle de un producto | No |
| GET | `/catalog/products/categoria/:categoriaId` | Productos por categoría | No |
| GET | `/client/profile` | Perfil del cliente autenticado | Sí (cookie) |
| PUT | `/client/profile` | Actualizar nombre/teléfono | Sí (cookie) |
| PUT | `/client/password` | Cambiar contraseña | Sí (cookie) |

### Admin (de index.js)
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/usuarios` | Listar usuarios | Admin |
| PUT | `/usuario/:id` | Editar usuario | Admin |
| DELETE | `/eliminarUsuario/:id` | Eliminar usuario | Admin |
| GET | `/roles` | Listar roles | Admin |

## Autenticación

- Se usa **JWT** guardado en cookie `access_token` (httpOnly)
- La cookie expira en **1 hora**
- Middleware `verificarToken` guarda datos en `req.usuario`
- Formato de respuesta: `{ ok: true/false, message/data }`

## CORS

El backend acepta peticiones desde:
- `http://localhost:5500` (Live Server)
- `http://localhost:5501`
- `http://localhost:3000`

Si necesitas agregar otro origen, pedirle al compañero que modifica `index.js`.


