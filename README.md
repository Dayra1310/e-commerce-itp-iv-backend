# E-commerce ITP IV Backend

Backend Express para el módulo de login, perfil, carga de imagen de usuario y administración de usuarios.

## Requisitos

- Node.js 20 o superior.
- MySQL 8 o superior.
- Base de datos con las tablas `usuarios` y `roles`.

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` como `.env` y ajusta las credenciales reales:

```bash
cp .env.example .env
```

Variables principales:

```env
APP_PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=ecommerce_tableros
JWT_SECRET=cambia_esta_clave_por_una_clave_larga_y_segura
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

> No se debe versionar ni compartir el archivo `.env` real porque contiene credenciales.

## Ejecución

```bash
npm run dev
```

Para producción/local sin nodemon:

```bash
npm start
```

## Endpoints principales

| Método | Ruta | Protección | Descripción |
|---|---|---|---|
| GET | `/health` | Pública | Verifica estado del servidor. |
| POST | `/login` | Pública | Inicia sesión y crea cookie `httpOnly`. |
| POST | `/logout` | Sesión | Cierra sesión. |
| GET | `/perfil` | Sesión | Devuelve datos del usuario autenticado. |
| PUT | `/perfil` | Sesión | Actualiza nombre visible del usuario autenticado. |
| PUT | `/usuario/imagen` | Sesión | Actualiza imagen de perfil. |
| GET | `/admin` | Administrador | Valida acceso administrativo. |
| GET | `/usuarios` | Administrador | Lista usuarios no cliente. |
| GET | `/roles` | Administrador | Lista roles disponibles para administración. |
| POST | `/agregarUsuario` | Administrador | Crea usuario administrativo. |
| PUT | `/usuario/:id` | Administrador | Edita usuario administrativo. |
| DELETE | `/eliminarUsuario/:id` | Administrador | Elimina usuario administrativo, excepto el usuario autenticado. |

## Seguridad aplicada

- Autenticación mediante JWT en cookie `httpOnly`.
- El frontend no necesita guardar tokens.
- Validación básica de email, teléfono, rol y longitud de contraseña.
- Hash de contraseñas con `bcrypt`.
- CORS restringido por `CORS_ORIGINS`.
- Validación de formato y tamaño de imágenes.
- Eliminación segura de imagen anterior, evitando rutas manipuladas.
