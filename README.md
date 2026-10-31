# Siempre cerca · QRHistoria

Un homenaje familiar: landing adaptable a celulares, álbum de fotos y videos, recuerdos de visitantes y panel privado para una única persona administradora. El contenido inicial es provisional; no contiene datos ni recuerdos inventados de la familia.

## Stack

Next.js / React / TypeScript / Tailwind, PostgreSQL con Prisma, Supabase Storage y Supabase Auth (correo y contraseña). No requiere Clerk. Visitantes sin cuenta.

## Inicio local

1. `npm install`
2. Copiar `.env.example` a `.env` y completar las variables. Nunca subir credenciales a Git.
3. `npm run db:generate`
4. En una base **vacía y exclusiva para este proyecto**, ejecutar `npm run db:migrate`. Se incluye la migración inicial. No apuntar a una base compartida con otros proyectos.
5. Ejecutar `npm run db:setup-storage` o `supabase/setup.sql` en el editor SQL de Supabase. Activa RLS, revoca acceso a las tablas desde el navegador y crea el bucket público `memorias` sin políticas de escritura pública.
6. Crear tu usuario con correo y contraseña desde Supabase → Authentication → Users, con correo confirmado. Configurar ese correo exacto en `ADMIN_EMAIL`. Desactivar nuevos registros en Authentication. No existe pantalla pública de registro.
7. `npm run dev`. Abrir la URL local y `/admin`.

Sin configuración completa, la landing muestra una vista previa y no guarda recuerdos. Un error de conexión con configuración completa muestra un aviso temporal, sin reemplazar los datos reales por contenido de ejemplo.

### Variables

- `DATABASE_URL`: conexión del servidor a PostgreSQL (pooler de Supabase si corresponde).
- `DIRECT_URL`: conexión para Prisma CLI/migraciones. Puede ser el pooler de sesión cuando la conexión directa IPv6 no esté disponible.
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: URL y clave pública anon de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: solo servidor; nunca usar prefijo `NEXT_PUBLIC_`.
- `ADMIN_EMAIL`: único correo permitido para operaciones administrativas, validado en servidor contra el usuario confirmado de Supabase.
- `SUPABASE_STORAGE_BUCKET` y `NEXT_PUBLIC_STORAGE_BUCKET`: ambos `memorias`. Si se cambia, actualizar también el SQL.
- `RATE_LIMIT_SECRET`: secreto aleatorio largo para anonimizar la dirección de red usada en el límite de envíos.

La conexión de Node a PostgreSQL verifica TLS con la CA pública de Supabase incluida en `certs/supabase-ca.crt` y exportada en `lib/supabase-ca.mjs`. No son credenciales privadas. Para estas conexiones, conservar las URLs del ejemplo sin parámetros `sslmode`/`sslrootcert` que sobreescriban la configuración TLS explícita del adaptador.

## Administrar

En `/admin`:

- **La página**: nombre/título, bienvenida, historia, frase y fotografía de portada, con subida, recorte o selección desde la biblioteca.
- **Fotografías de la historia**, dentro de «La página»: dos fotos acompañantes de la portada (tres en total con la principal), tres fotos en «Su historia» y una foto con frase en Momentos, Su frase, Recuerdos y Cierre. Puedes cambiar, acomodar o retirar cada foto y guardar su frase. Los espacios vacíos se muestran únicamente al administrador, sin dejar bloques incompletos al público.
- **Editar en la web**: la misma landing con textos seleccionables. Haz clic sobre un texto, edítalo y confirma para guardarlo. Incluye encabezados, bajadas, firmas y textos del álbum. Haz clic sobre una foto para reemplazarla o volver a recortarla. La portada usa un marco 4:5 y el álbum 4:3; también se puede añadir una foto nueva desde esta vista. Los recuerdos de visitantes se moderan en su pestaña, sin editar sus palabras.
- **Álbum**: JPG/PNG/WebP, recorte arrastrando y zoom, proporciones 4:3, 3:4, 1:1 y 16:9; compresión y vista previa antes de subir. Título, época y descripción. Borradores, publicación individual, flechas para ordenar y eliminación con confirmación.
- **Galería**: carga de varias fotos, hasta 30 por tanda y originales de hasta 80 MB por archivo. Se comprimen una a una a WebP buscando 200 KB, con hasta 1920 px en el lado mayor. Por defecto se conserva la foto completa; «Acomodar foto» abre el modal si quieres cambiar el encuadre. Puedes editar títulos, frases, orden y visibilidad. Estas fotos exclusivas no alargan el home.
- **Recuerdos**: nombre libre de persona o familia, mensaje y hasta tres fotografías opcionales. Los nuevos recuerdos aparecen inmediatamente. Desde el panel puedes ocultarlos, volver a mostrarlos o eliminarlos con sus fotos. Los recuerdos antiguos que estaban pendientes conservan su estado oculto.

Se conserva únicamente el archivo procesado en Storage; guarda los originales en un respaldo familiar separado. Los archivos con URL pública, incluso en borrador, son accesibles si alguien conoce esa URL. No es un sistema para contenido confidencial. `noindex` pide a buscadores no indexar, pero no restringe el acceso.

La portada, las fotos del álbum y las fotos de recuerdos abren un visor de pantalla completa al tocarlas. Muestra la fotografía guardada sin recortes adicionales, con una X de 48 px siempre visible; también se cierra con Escape y restaura el foco sin desplazar la página. El visor usa el archivo optimizado, no una copia original sin comprimir.

## Galería y presentación

- `/` es el recorrido de la historia. Los mensajes de visitantes, con nombre, texto y fotos, aparecen en «Cada recuerdo, una forma de abrazar», antes del formulario «¿Qué recuerdo guardas con él?» (los títulos son editables).
- `/galeria` es la galería independiente. Reúne todas las fotografías publicadas del home, las fotos exclusivas de la galería y las fotos de recuerdos visibles. No copia los archivos ni hereda el límite de 200 recuerdos del home. Solo aparecen fotografías; los videos se siguen reproduciendo desde el álbum del home.
- Los filtros «Todas», «Familia» y «Recuerdos compartidos» permiten elegir la colección; también hay búsqueda por título, frase o nombre. Para una ceremonia puedes seleccionar «Familia» si quieres presentar únicamente las fotos que tú publicaste.
- Tocar una miniatura abre su visor en pausa, con anterior/siguiente y gesto horizontal en celular. «Iniciar presentación» comienza el bucle automático y solicita pantalla completa si el navegador la admite. No hay reproducción automática al entrar ni música automática.
- Velocidad de 3–30 segundos por foto, guardada en el dispositivo. Pausa conserva la foto; detener, la X o Escape vuelven a la galería. Con el foco fuera de los controles se pueden usar las flechas para avanzar/retroceder y Espacio para pausar/reanudar.
- El display alterna composiciones, fundidos y movimiento lento sin recortar la fotografía. Respeta `prefers-reduced-motion`. Los controles se ocultan al dejar de usarlos y reaparecen al mover el puntero, tocar o enfocarlos con el teclado; la X queda siempre visible.
- Solo se precargan las próximas dos fotos. Se pausa el avance al ocultar la pestaña y se intenta mantener encendida la pantalla durante la reproducción cuando el navegador ofrece Screen Wake Lock. Las funciones opcionales fallan de forma controlada.
- Al ocultar un recuerdo, sus imágenes salen también de la galería y la presentación. Las galerías abiertas actualizan su colección cada 30 segundos mientras estén visibles; un fallo de red conserva la última colección cargada.
- Para HDMI desde PC: conecta la pantalla, duplica o extiende el escritorio y abre la galería en esa pantalla; inicia la presentación y ajusta la velocidad. Desde un celular: puedes reproducir en horizontal o usar la función de duplicar pantalla del dispositivo. No se implementa un emisor propio de Chromecast/AirPlay; la conexión depende del equipo y del sistema operativo.

Los espacios usan el campo `Media.placement` ya existente, con reemplazo transaccional y limpieza del archivo anterior. Esta ampliación no necesita una migración de la base de datos ni variables nuevas en Vercel.

## Peso y consumo

- Fotos del administrador: modal de encuadre con desplazamiento, zoom y vista previa del recorte final. Canvas → WebP, lado mayor inicial de hasta 1600 px y objetivo de 450 KB. El algoritmo prueba calidades de 84, 76 y 68; si hace falta, reduce las dimensiones un 18% y vuelve a codificar desde los píxeles originales. El máximo de seguridad es 2 MB, no el objetivo de almacenamiento. Se puede volver a recortar el archivo almacenado; para recuperar zonas que ya fueron descartadas hay que seleccionar el original. Las fotos del álbum se muestran completas dentro del marco; la portada tiene proporción 4:5 consistente en móvil y escritorio.
- Fotos de visitantes: hasta tres por recuerdo. Se aceptan originales JPG, PNG y WebP de hasta **80 MB en el dispositivo**, sin enviarlos con ese peso. El modal aplica compresión adaptativa con lado mayor inicial de hasta 1920 px y un **objetivo de 200 KB por foto**. Se intenta conservar primero la calidad y después se reducen las dimensiones progresivamente; no se pide al visitante que haga un recorte más pequeño para cumplir el peso. El objetivo no es una garantía de tamaño exacto ni una compresión sin pérdida.
- El servidor admite hasta 1 MB por foto ya preparada y hasta 3300 KB por formulario (por debajo del límite de cuerpo de Vercel). Valida formato real y píxeles, optimiza nuevamente cuando hace falta y elimina metadatos. El archivo almacenado tiene un máximo de seguridad de 500 KB; los originales más grandes no se rechazan por superar ese tamaño, porque se reducen antes de subir. Un WebP ya pequeño y sin metadatos se conserva si recodificarlo lo haría crecer. No se aceptan videos de visitantes.
- `MEMORY_PHOTO_BUDGET_MB`: presupuesto para fotos de recuerdos, 150 MB por defecto, configurable entre 1 y 500 MB. Se reserva atómicamente antes de subir; al agotarse se siguen aceptando mensajes sin fotos. El presupuesto cubre las fotos de recuerdos, no reemplaza las cuotas totales de Supabase ni el seguimiento de tráfico.
- Video: MP4 de hasta 25 MB. **No hay transcodificación automática en el MVP.** Preparar en HandBrake con H.264, 720p, AAC, opción Web Optimized; ajustar calidad para llegar al peso deseado. Mantener el original fuera de Supabase. La extensión MP4 no garantiza códecs compatibles: revisar reproducción en móvil antes de publicar.
- Los videos se solicitan al abrir su visor, con controles y sin autoplay. Las fotos del álbum usan carga diferida.
- El panel suma los bytes de archivos registrados. No es un medidor de cuota de Supabase y no incluye archivos huérfanos ni tráfico. Revisar Storage y egress en el dashboard de Supabase: el tráfico de muchas reproducciones también consume cuota.
- La base guarda textos y referencias. Fotos y videos consumen Storage, no se almacenan como binarios en PostgreSQL. No se usan transformaciones de imágenes del servidor de Supabase.

## Protección y límites del MVP

- Rutas de administración verifican el token con Supabase y comparan el correo del usuario; ocultar botones no concede permisos.
- Mutaciones requieren mismo origen. Validación de campos, trampa antispam y cinco intentos válidos por dirección de red por hora, con contador atómico. Configurar el hosting para que sanee `X-Forwarded-For`; con un proxy no confiable este límite puede evadirse. Para exposición amplia puede añadirse Turnstile.
- Los visitantes suben únicamente las fotografías comprimidas junto con el formulario; no reciben acceso directo de escritura a Storage. Se limita el cuerpo completo incluso sin `Content-Length`, el número de fotos, los bytes y los píxeles decodificados.
- El panel carga hasta 500 recuerdos; la landing muestra los 200 visibles más recientes. Añadir paginación si el homenaje crece. Ocultar quita el recuerdo de la página, pero no revoca URLs públicas que alguien ya conozca.
- La subida de Storage y el registro en PostgreSQL no forman una transacción. Se intenta retirar archivos cuando falla el registro; si la limpieza falla, se conserva la reserva de espacio. El panel informa si una eliminación física necesita completarse en Storage.
- No incluye recuperación de contraseña en la interfaz; el usuario administrador se gestiona desde Supabase.
- Las credenciales reales se mantienen exclusivamente en `.env` ignorado por Git y en las variables del hosting; `.env.example` solo contiene ejemplos.

## Tema y animaciones

El botón de sol/luna permite elegir modo claro u oscuro en la landing y en el panel. La preferencia queda guardada únicamente en el navegador; sin elección previa se toma el tema del sistema. El tema se aplica antes del primer render para evitar un destello claro. Las secciones aparecen suavemente al desplazarse y los botones y fotografías responden al cursor. `prefers-reduced-motion` desactiva estos movimientos. Sin JavaScript, el contenido sigue visible.

## Deploy en Vercel

1. Importar `luciano-raw/qrhistoria`, preset **Next.js**, carpeta raíz del repositorio.
2. Se fija Node **22.x** en `package.json`. Build: `npm run build`. Instalación: `npm ci`.
3. Copiar a Vercel las variables de `.env.example` con los valores reales de `.env`. **GitHub no envía `.env` a Vercel**. Solo URL, clave anon y nombre de bucket llevan prefijo público; la clave service_role, las URLs de PostgreSQL y el secreto antispam son privados.
4. El build no modifica la base. Aplicar `npm run db:migrate` y `npm run db:setup-storage` desde un equipo autorizado antes de publicar cambios de esquema.
5. Crear el usuario administrador en Supabase Authentication con el correo configurado y correo confirmado. Desactivar nuevos registros. Configurar Site URL en Supabase con la URL definitiva del homenaje.
6. Comprobar login, edición visual, fotos, videos y envío/ocultamiento de recuerdos antes de imprimir el QR.

La aplicación permanece en vista previa hasta completar también las claves de Supabase. Agregar variables después de un deploy requiere volver a desplegar, especialmente las variables `NEXT_PUBLIC_*` que se incluyen en el build.

Referencias: [Node en Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) y [conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Publicación y QR

Conectar el repositorio al hosting de Next.js que elijas y configurar las mismas variables. Las migraciones requieren la conexión de base adecuada. Probar entrada de admin, subida, reproducción, moderación y visibilidad pública antes de compartir. Elegir una URL estable antes de imprimir el QR; después se puede renovar el contenido sin cambiar el código impreso. El generador de QR queda pendiente hasta tener esa URL definitiva.

## Comprobaciones

`npm run typecheck`, `npm test` y `npm run build` (Node 22.12 o posterior). El proxy del hosting debe preservar el encabezado Host público. Las operaciones con Supabase necesitan un proyecto configurado para verificación de extremo a extremo.

`node --experimental-strip-types scripts/check-memory-limits.mjs` verifica en PostgreSQL el alta con fotos y ocultamiento dentro de una transacción que se revierte, la concurrencia del límite y el rechazo por presupuesto. Solo crea contadores de prueba con identificadores aleatorios y los limpia; no publica recuerdos ni sube archivos.

`node scripts/check-photo-slots.mjs` comprueba los bloqueos transaccionales para espacios de fotos, su asignación a secciones y las frases; todos sus cambios se revierten. Las pruebas de galería cubren visibilidad, moderación, duplicados y repetición continua del índice de presentación.
