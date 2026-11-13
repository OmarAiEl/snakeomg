# SnakeOMG en Google Sites

Esta copia conserva el código original y añade una configuración opcional de alojamiento en Render. Google Sites no ejecuta Node.js ni SQLite: muestra la web externa mediante una inserción. No se ha desplegado ni contratado ningún servicio.

## 1. Alojamiento

1. Descomprime este ZIP y sube su contenido, incluidas las carpetas `portable` y `codigo-original`, a un repositorio privado de GitHub nuevo. No reutilices por error un proyecto existente.
2. En https://dashboard.render.com/ crea un Blueprint nuevo y selecciona ese repositorio. `render.yaml` configura un servicio Docker, un disco persistente de 1 GB y una instancia. Revisa el coste antes de confirmar: el disco requiere un servicio de pago. Puedes cambiar el nombre de servicio si ya existe.
3. Una vez desplegado, abre la URL HTTPS que te proporciona Render. El Dockerfile usa automáticamente `RENDER_EXTERNAL_URL`. Si utilizas un dominio personalizado, configura `PUBLIC_ORIGIN` con su origen exacto y usa ese mismo dominio en Sites.
4. Comprueba `/healthz`, registro, inicio de sesión, guardado y multijugador en la URL directa. No se han incluido usuarios de producción. La base nueva se crea en `/var/data/snakeomg.sqlite`.

## 2. Google Sites

1. Abre https://sites.google.com/new y crea un sitio llamado SnakeOMG.
2. En Páginas, pulsa + > Inserción de página completa. Nombra la página Jugar.
3. Pega la URL HTTPS real del servidor y pulsa Insertar.
4. Previsualiza en escritorio y móvil; comprueba el registro, login, progreso y juego desde la inserción. Si el navegador impide cookies o la inserción, crea un botón que abra directamente la URL del juego en una pestaña nueva.
5. Publica el sitio desde Google Sites cuando hayas verificado que funciona.

## 3. Trabajar en el código

Edita `codigo-original/worker/`. Consulta `LEEME.md` para saber cómo regenerar `portable/app.mjs` y ejecutar las pruebas. Sube el archivo compilado y las migraciones correspondientes al repositorio para actualizar Render. Sites seguirá mostrando la misma URL; el editor de Google Sites no sustituye un editor del código del juego.

## Límites de esta preparación

- No se ha cambiado el código del juego, autenticación ni simulación. Se añadieron Dockerfile, render.yaml y archivos auxiliares de despliegue.
- Se verificó la integridad de la exportación original y la prueba HTTP local con Node 22.16.0; la imagen Docker Node 24 y la inserción en Google Sites no se han probado en producción.
- Las cookies de sesión son Secure, HttpOnly, SameSite=None y Partitioned. La compatibilidad depende del navegador y del contexto de iframe; una sesión directa puede ser distinta a una sesión insertada.
- El limitador usa la IP de conexión, que detrás del proxy de Render puede agrupar a varios usuarios. Antes de un lanzamiento masivo, revisar IP confiable, seguridad y carga.
- El multijugador sigue usando HTTP; no se ha implementado WebSocket. El código original incluye la configuración de su proyecto anterior: no la uses para desplegar accidentalmente allí.

Referencias oficiales: https://support.google.com/sites/answer/90569?hl=es ; https://render.com/docs/blueprint-spec ; https://render.com/docs/disks ; https://render.com/docs/environment-variables
