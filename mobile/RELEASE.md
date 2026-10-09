# Publicar SpanGlish sin saltarse las pruebas

SpanGlish tiene dos destinos de actualización:

- **Preview:** solamente Horace. Aquí se prueba cada cambio primero y pueden aparecer advertencias por revisiones visuales humanas todavía pendientes.
- **Production:** testers internos. Recibe únicamente el mismo Preview inmutable probado y aprobado explícitamente por el usuario, después de pasar los controles de integridad.

`origin/main` es la única fuente de verdad para código, backend y publicaciones móviles. Toda rama de trabajo abre un pull request hacia `main` y se elimina localmente y en GitHub después de integrarse. No se crean ni se conservan ramas compartidas de Preview o Production.

Un push a una rama de trabajo no publica una actualización móvil. Preview y Production se publican únicamente mediante sus workflows protegidos de GitHub Actions, desde el head remoto exacto de `main`. Por ahora, ambas apps usan el mismo backend Render desplegado desde `main`.

Cloudflare R2 (`https://cdn.learnspanglish.app`) es el origen predeterminado para imágenes, videos, efectos y audio inmutable. Render conserva el API, sin disco de medios. Los workflows protegidos validan todos los bytes y recibos publicados contra los inventarios versionados antes de subir a Expo. Consulta [la publicación de medios](../docs/operations/cloudflare-course-media.md).

## Backend compartido actual

No cambies la rama del servicio Render: debe seguir desplegando `main`. Cuando un cambio modifica lecciones, rutas o audio que dependen del backend, intégralo primero en `main` y espera el despliegue completo. Antes de subir a Expo, el publicador comprueba que el backend corresponda al mismo commit y que el catálogo de audio sea idéntico y esté listo.

Si más adelante se crea un backend exclusivo para Preview, debe tener servicio, disco, base de datos, credenciales y gate propios. Para poblar su disco se copian los MP3 y recibos inmutables ya validados; no se vuelve a generar un catálogo existente.

## Configuración inicial por teléfono

Preview se compila en la nube de Expo; no necesita el servidor local de Metro. Desde el head protegido de `main`, ejecuta **Publish SpanGlish Preview** con `delivery: native-build` y una descripción. `native_platform: all` entrega un build interno para Android y otro para iOS. Para la revisión Android aprobada mientras falta la firma de iOS, elige `native_platform: android`; iOS sigue pendiente.

El archivo de carga contiene únicamente `mobile/`. El backend, el frontend web, el historial de Git y los archivos locales de desarrollo no se suben a Expo; EAS conserva el hash del commit como metadato de cada build.

Comparte el enlace de instalación de Preview únicamente con la persona que aprueba los cambios. La app se llama **SpanGlish Preview**, se puede instalar al lado de SpanGlish Production y muestra una franja amarilla indicando que los cambios aún no llegaron a los testers.

## Flujo normal para cada cambio

No se requiere una preaprobación humana antes de implementar o publicar en Preview: Preview es el entorno normal de revisión. Solamente se agrega una preaprobación cuando Horace la pide explícitamente antes de comenzar el cambio. Los controles automáticos de integridad siguen siendo obligatorios y Production conserva su aprobación explícita separada.

### 1. Guardar y verificar el cambio

El cambio debe estar en un commit y respaldado en GitHub. Nunca se publica desde la rama de la tarea ni desde un worktree local.

Antes del commit se puede ejecutar el mismo preflight que usa la publicación:

```powershell
cd mobile
npm run verify:preview
```

Este comando valida las tarjetas y sus archivos multimedia, comprueba TypeScript y exporta el bundle Android de producción en un directorio temporal.

La política de Preview permite que una decisión humana marcada `pending`, la evidencia de recorte 4:5 pendiente y una firma de renderizador obsoleta por cambios de interfaz aparezcan como advertencias. La advertencia sirve para que la revisión pueda hacerse en la app real; no significa que la imagen esté aprobada. Un rechazo, contrato o archivo ausente, hash semántico, de bytes o de vínculo de activo obsoleto que no sea solamente la firma del renderizador, copia distinta, respuesta ambigua, medio inválido o curso incompleto sigue deteniendo Preview.

### 2. Integrar solamente en `main`

1. Actualiza tu rama desde el `origin/main` más reciente.
2. Abre un pull request hacia `main`.
3. Espera que **Verify complete release candidate** termine correctamente.
4. Integra el pull request sin force-push.
5. Confirma que GitHub eliminó la rama remota; elimina también la rama local y su worktree limpio.

GitHub está configurado para eliminar automáticamente la rama origen de un pull request integrado. El auditor de higiene reporta ramas fusionadas que hayan quedado atrás. Una rama con commits todavía no integrados se conserva hasta revisar y guardar su estado.

### 3. Esperar el backend de `main`

Espera a que Render despliegue el head actual de `origin/main`. No basta un cambio equivalente: el backend, GitHub y el candidato móvil deben indicar el mismo commit exacto.

### 4. Publicar en Preview desde `main`

En GitHub Actions, ejecuta **Publish SpanGlish Preview** desde `main` e incluye una descripción corta. El workflow no acepta otra rama y usa el secreto `EXPO_TOKEN` del ambiente protegido de publicación.

El workflow:

1. Comprueba que el commit sea exactamente el head remoto protegido de `main`.
2. Valida el manifiesto de integridad, el catálogo completo declarado y la identidad visible del commit. No hay un límite fijo de unidades o lecciones: conserva las existentes y actualiza el manifiesto cuando se aprueba nuevo contenido, manteniendo una duración similar por lección.
3. Ejecuta el preflight completo de contenido, backend, TypeScript y bundle Android.
4. Espera a que el backend compartido informe ese mismo commit de `main`, el SHA-256 y la cantidad exactos del catálogo candidato, con cero audios faltantes, inválidos o con error.
5. Exporta explícitamente Android e iOS con las variables de EAS Preview, sin cargar archivos `.env` locales ni incluir web. Valida ambos bundles y sus assets; después publica ese export en un solo grupo del canal `preview` con `--skip-bundler`, sin permitir dos publicaciones simultáneas y comprobando de nuevo el head remoto antes de subir.
6. Consulta Expo después de publicar y comprueba que Android e iOS correspondan al mismo commit. En un build nativo Android, verifica exactamente la plataforma solicitada; las OTA conservan ambas plataformas.
7. No modifica `production`.

`npm run release:preview`, `eas update` y `npx eas-cli update` están prohibidos como publicación local. Si GitHub Actions o su secreto no están disponibles, la publicación queda bloqueada; no se usa la sesión local de Expo como atajo.

### 5. Probar en el teléfono

En **SpanGlish Preview**:

1. Abre Configuración.
2. Selecciona **Actualizar**.
3. Prueba el cambio y las funciones esenciales.
4. Revisa las imágenes pendientes en su encuadre real y registra las decisiones humanas sin aprobarlas automáticamente.
5. Copia el `Group ID` que mostró Expo al publicar.

### 6. Publicar el Preview aprobado en Production

Estándar aprobado el 2026-10-06: probar y aprobar explícitamente el Preview exacto es suficiente para la decisión humana de promoción. Las revisiones de imagen pendientes, firmas antiguas del renderizador y diferencias del registro de recortes 4:5 se muestran como avisos; no bloquean ese Preview aprobado ni cambian automáticamente sus registros. Siguen bloqueando contenido inválido, imágenes rechazadas, contratos o archivos ausentes, hashes de contenido incorrectos y diferencias de bytes entre clientes.

Cada PR y publicación Preview incluye **Production readiness** en el resumen de GitHub y un artefacto `release-readiness` con el inventario de contextos afectados y sus vínculos actuales/guardados. El resumen de un Preview OTA publicado también muestra el Group ID exacto y el enlace al workflow Production. `Eligible after testing and approving the exact Preview` no es una aprobación automática.

Si las aprobaciones humanas se guardaron después del Preview probado, esas aprobaciones forman un commit nuevo. Intégralo en `main`, publícalo otra vez en Preview, pruébalo y usa el nuevo `Group ID`; nunca promociones el grupo anterior.

Solamente después de que el usuario apruebe explícitamente ese Preview exacto, ejecuta **Publish SpanGlish Production** desde `main`, indica el `Group ID` probado y marca la confirmación de Production. El workflow:

1. Exige el head remoto exacto y protegido de `main`.
2. Ejecuta `npm run verify:production`: integridad obligatoria y avisos de revisión visibles.
3. Comprueba que el grupo Preview más reciente incluya Android e iOS con ese mismo commit.
4. Republica ese grupo inmutable en el canal `production`; no compila contenido local diferente.
5. Verifica que Expo publicó el mismo commit en Production.

`npm run release:production` y `eas update:republish` están prohibidos como publicación local. La confirmación del workflow no sustituye la aprobación explícita del usuario.

## Cuándo hace falta un build nuevo

Las modificaciones solamente de TypeScript/JavaScript, textos, lecciones, imágenes y audio normalmente usan el workflow de Preview.

Se necesita un build nuevo cuando cambia cualquiera de estos elementos:

- dependencias nativas o versión de Expo;
- permisos o plugins en la configuración;
- código de los módulos nativos de voz;
- versión visible de la aplicación.

En ese caso, incrementa la versión de la app y crea el build de Preview antes del build de Production.

Para un build nativo, ejecuta **Publish SpanGlish Preview** desde el head protegido de `main` con `delivery: native-build`. El mismo gate de curso y backend verifica el candidato; EAS compila las plataformas solicitadas (`native_platform: all` por defecto, o `android` para la revisión Android aprobada) con el perfil interno `preview`, conserva el hash Git y lo incluye en la etiqueta de la app. El workflow exige exactamente un resultado terminado por plataforma, con el commit, canal, perfil y versión correctos, y entrega los enlaces de instalación. Esta opción no ejecuta una OTA ni publica en Production. Instala el nuevo build: **Actualizar** no puede agregar módulos nativos. La revisión Android no da por verificado iOS ni cambia las condiciones de promoción a Production.

## Google Play y Apple TestFlight

Confirmado el 2026-10-09: los destinos siguen siendo **Google Play internal testing** y **Apple TestFlight**, incluido el grupo existente **First iPhone Testers**. Una OTA de Expo Production no sube un AAB ni un IPA a las tiendas.

1. Integra los cambios mediante PR y ejecuta **Release SpanGlish Store Testers** desde `main`, con `action: build` y `platform: all`. El workflow protegido valida contenido, backend y medios; EAS crea los binarios nativos con el perfil `production`, sin enviarlos a las tiendas. El resumen entrega los IDs exactos, versiones y commit.
2. Publica y prueba el Preview del mismo commit. La configuración o las dependencias nativas nuevas requieren primero el build Preview correspondiente. Cualquier commit nuevo exige probar y aprobar un nuevo grupo Preview antes de enviar los binarios a testers.
3. Después de la aprobación explícita, ejecuta el mismo workflow con `action: submit`, los IDs exactos de Android/iOS, el `group_id` aprobado y `confirmed: true`. Verifica de nuevo el head remoto y los metadatos de cada build; nunca usa `--latest`. Se puede seleccionar una sola plataforma para reintentar una entrega parcial sin repetir la otra.
4. Android usa `com.gorre.spanglish`, track `internal` y estado `completed`; iOS usa App Store Connect `6800510214` y EAS Submit carga el build en TestFlight. Las credenciales de firma deben estar configuradas en EAS. El envío automático también requiere las credenciales de envío existentes. Si falta una clave de envío, usa `action: verify` con los mismos IDs, grupo y confirmación para validar los binarios en CI; luego carga únicamente el artefacto verificado mediante la consola oficial ya autenticada, después de comprobar de nuevo el head remoto. No se guardan claves en Git, no se compila localmente ni se cambia ningún canal Expo desde la consola.
5. Confirma en Play Console que la versión está disponible en pruebas internas. En App Store Connect, espera el procesamiento y agrega el build al grupo existente **First iPhone Testers**; completa la revisión beta si Apple la requiere. No se crean nuevos grupos ni se amplía la audiencia. Una carga exitosa todavía no confirma disponibilidad para testers.

Este workflow no modifica las OTA ni envía una versión pública a Google Play o App Store. La promoción OTA conserva el workflow y el grupo inmutable aprobados de la sección anterior.

## Si un cambio falla

No lo publiques en Production. Corrige el problema, integra otro pull request en `main` y publica otro Preview. Si un problema ya llegó a Production, usa el panel de Expo o `eas update:rollback` para regresar al update anterior.

Si Preview no muestra todas las unidades declaradas en el manifiesto, no muestra el commit o apunta a un commit distinto al workflow, detén las pruebas. No intentes corregirlo publicando desde otra rama: restaura el último grupo aprobado mediante el flujo protegido y registra el incidente.

## Separación futura del backend

Cuando se apruebe un segundo servicio, Preview y Production deberán usar servicios, discos, bases de datos y credenciales separados. Hasta entonces, el gate exige el mismo commit exacto de `main` y bloquea cualquier diferencia de catálogo o inventario antes de subir a Expo.
