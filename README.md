# E-commerce ITP IV Backend

Backend para el proyecto de e-commerce ITP IV desarrollado con Fastify, TypeScript y Vite.

## Requisitos

- Node.js 20+
- npm
- MySQL 8.0+

## Instalación de MySQL

Se recomienda usar [DBngin](https://dbngin.com/) para instalar y gestionar MySQL de forma sencilla.

Otra opción es instalar MySQL directamente desde [mysql.com](https://www.mysql.com/downloads/).

## Instalación

```bash
npm install
```

## Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=ecommerce

PORT=4200
```

El archivo `.env.example` contiene la plantilla de variables requeridas.

## Configuración

La configuración centralizada se encuentra en `src/config/index.ts`. Este archivo lee las variables de entorno y las exporta de forma segura.

## Base de Datos

### Drizzle ORM

Este proyecto utiliza Drizzle ORM para la gestión de la base de datos MySQL.

### Esquemas

Los esquemas se definen en `src/db/schema.ts`. Si necesitas realizar cambios a nivel de base de datos (crear tablas, modificar columnas, etc.), debes:

1. **Modificar los esquemas** en `src/db/schema.ts`
2. **Generar las migraciones** con:
   ```bash
   npm run db:generate
   ```
3. **Aplicar las migraciones** a la base de datos con:
   ```bash
   npm run db:migrate
   ```

### Estructura de archivos de base de datos

```
src/db/
├── index.ts    # Conexión a la base de datos
└── schema.ts   # Definición de tablas y esquemas
```

## Desarrollo

Para iniciar el servidor en modo desarrollo:

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:4200`

## Build

Para compilar el proyecto:

```bash
npm run build
```

Los archivos compilados se generarán en la carpeta `dist/`.

## Endpoints

- `GET /health` - Verificar estado del servicio

## Tecnologías

- **Fastify** - Framework web
- **TypeScript** - Lenguaje de programación
- **Vite** - Build tool y servidor de desarrollo
- **Drizzle ORM** - ORM para MySQL
