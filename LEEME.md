# SnakeOMG — copia completa del código

Exportación: 13 de noviembre de 2026. Incluye el código disponible en este proyecto, sus recursos integrados, migraciones SQL y pruebas. No cambia la web publicada.

## Qué contiene

- `codigo-original/`: copia de los archivos versionados del proyecto Sites/Cloudflare, incluyendo servidor, registro/login, guardado por cuenta, campaña, práctica, multijugador, personalización, gráficos, audio, configuración y dependencias declaradas.
- `portable/`: aplicación compilada y adaptador Node.js + SQLite para ejecutarla sin ChatGPT ni Cloudflare. Los gráficos y sonidos del juego están integrados en el código. No necesita instalar paquetes para arrancar.
- `SHA256SUMS.txt`: comprobaciones de integridad de cada archivo.

## Arranque sencillo en tu ordenador

1. Instala Node.js 24 LTS (el adaptador requiere al menos Node 22.13, con `node:sqlite`).
2. Descomprime el ZIP y abre una terminal en la carpeta `portable`.
3. Ejecuta `node server.mjs`.
4. Abre `http://localhost:3000` y registra una cuenta nueva.

La base se crea automáticamente en `portable/data/snakeomg.sqlite`. Es persistente: al reiniciar el servidor conserva cuentas y progreso. No abras `app.mjs` con doble clic: se necesita el servidor. En localhost el adaptador usa una cookie local; en un dominio público conserva cookies seguras y exige HTTPS.

Prueba automática, sin modificar tus datos: `node smoke-test.mjs`.

## Montarlo en otro servidor

Sube la carpeta `portable` a un servidor compatible con Node.js 24 y disco persistente. Comando de inicio: `node server.mjs`. Configura estas variables mediante el panel del proveedor:

| Variable | Valor |
| --- | --- |
| `PUBLIC_ORIGIN` | Tu URL pública exacta, por ejemplo `https://juego.tudominio.com` |
| `HOST` | `0.0.0.0` para aceptar tráfico del proveedor |
| `PORT` | Puerto asignado por el proveedor (por defecto 3000) |
| `DATABASE_PATH` | Ruta absoluta en un disco persistente, por ejemplo `/data/snakeomg.sqlite` |

Configura HTTPS en el proxy o alojamiento y dirige el tráfico al puerto de Node. Ruta de comprobación: `/healthz`. La aplicación portátil se debe ejecutar como UNA instancia; no escales a varios servidores con bases SQLite separadas porque crearían salas y cuentas independientes. No pongas el archivo SQLite en una carpeta pública. Sin disco persistente, un redespliegue puede perder la base.

El limitador de acceso usa la IP de conexión al servidor. Tras un proxy puede agrupar a varios visitantes; antes de un lanzamiento público grande, configura el proxy y una política de IP confiable específica del proveedor.

## Base de datos y datos reales

**Este ZIP es una copia del código y del esquema, NO una copia de la base de datos de producción.** Las cuentas, contraseñas cifradas mediante hash, sesiones y progresos ya existentes permanecen en la base D1 del sitio original. La aplicación portátil comienza con una base vacía. No se han incluido credenciales ni claves de despliegue.

Las migraciones SQL están en `codigo-original/drizzle/` y `portable/migrations/`. Para conservar los usuarios actuales al trasladar la web, hace falta exportar e importar por separado las tablas `users` y `player_progress`, preservando sus IDs. Es preferible invalidar las sesiones antiguas. La sala activa y los límites de acceso son datos temporales; no son necesarios para conservar el progreso. No ejecutes un volcado SQL sobre una base ya migrada sin revisar previamente la compatibilidad y hacer una copia.

Para respaldar la versión portátil, detén el proceso antes de copiar la carpeta `data` completa, o utiliza un respaldo consistente de SQLite. No copies únicamente el archivo principal mientras se está escribiendo con WAL activo.

## Estado exacto del multijugador

Incluye una sala compartida autenticada y 8 bots. La práctica conserva su funcionamiento independiente. La sala actual sincroniza mediante peticiones HTTP y base de datos; los controles tienen predicción visual. La latencia de esa arquitectura sigue pendiente de resolver. **El servidor WebSocket propuesto para Render todavía NO está implementado ni desplegado y no forma parte de esta copia.** Ejecutar la versión portátil elimina la dependencia de D1 para esta versión, pero no equivale a haber completado ni validado la migración a WebSockets.

## Editar el código

La fuente original está en `codigo-original/worker/`:

- `game-html.ts`: HTML completo del juego como cadena; contiene estilos, recursos y scripts integrados.
- `auth-page.ts`: acceso y registro con fondo animado.
- `auth.ts` y `progress.ts`: cuentas, sesiones y progreso.
- `arena.ts` y `arena-engine.ts`: sala compartida y simulación del servidor.
- `online-client.js` y `progress-client.js`: fuentes de los scripts que también están incrustados en `game-html.ts`. Al editarlos debes actualizar asimismo la copia incrustada.

Para reconstruir `portable/app.mjs` tras editar la fuente, instala las dependencias del proyecto original (`npm ci`, con acceso a Internet) y ejecuta desde `codigo-original`:

```sh
npx esbuild worker/auth.ts --bundle --platform=node --format=esm --outfile=../portable/app.mjs
```

Ejecuta después `node ../portable/smoke-test.mjs`. Para cambios del esquema copia las nuevas migraciones a `portable/migrations` y prueba antes sobre una copia de la base.

La configuración original de Sites identifica el proyecto publicado. No la uses para publicar una copia en ese mismo proyecto por accidente. El archivo README del proyecto original describe su plantilla de desarrollo; esta guía es la entrada principal para el respaldo entregado.

## Verificación y exclusiones

Se ha comprobado el arranque HTTP del adaptador y el registro, acceso al juego, guardado/lectura de progreso, ingreso a la sala con 8 bots, cierre de sesión y nuevo login. No se ha realizado una prueba visual completa en otro alojamiento ni una prueba de carga.

No se incluyen `node_modules`, cachés, archivos temporales, historial Git, credenciales ni bases de usuarios reales. Las dependencias del proyecto original se recuperan a partir de su manifiesto y lockfile. Esto no elimina código del juego. El adaptador portátil utiliza únicamente Node y la aplicación ya compilada.
