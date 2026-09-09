# Publicar SpanGlish sin saltarse las pruebas

SpanGlish tiene dos destinos de actualización:

- **Preview:** solamente Horace. Aquí se prueba cada cambio primero y pueden aparecer advertencias por revisiones visuales humanas todavía pendientes.
- **Production:** testers internos. No recibe cambios hasta que el mismo commit fue probado en Preview, recibió aprobación explícita y todas las revisiones visuales están vigentes.

`origin/main` es la única fuente de verdad para código, backend y publicaciones móviles. Toda rama de trabajo abre un pull request hacia `main` y se elimina localmente y en GitHub después de integrarse. No se crean ni se conservan ramas compartidas de Preview o Production.

Un push a una rama de trabajo no publica una actualización móvil. Preview y Production se publican únicamente mediante sus workflows protegidos de GitHub Actions, desde el head remoto exacto de `main`. Por ahora, ambas apps usan el mismo backend Render desplegado desde `main`.

## Backend compartido actual

No cambies la rama del servicio Render: debe seguir desplegando `main`. Cuando un cambio modifica lecciones, rutas o audio que dependen del backend, intégralo primero en `main` y espera el despliegue completo. Antes de subir a Expo, el publicador comprueba que el backend corresponda al mismo commit y que el catálogo de audio sea idéntico y esté listo.

Si más adelante se crea un backend exclusivo para Preview, debe tener servicio, disco, base de datos, credenciales y gate propios. Para poblar su disco se copian los MP3 y recibos inmutables ya validados; no se vuelve a generar un catálogo existente.

## Configuración inicial por teléfono

Preview se compila en la nube de Expo; no necesita el servidor local de Metro. Desde el head protegido de `main`, ejecuta **Publish SpanGlish Preview** con `delivery: native-build` y una descripción. El workflow entrega un build interno para Android y otro para iOS.

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
2. Valida el manifiesto de integridad, 70 lecciones, siete unidades de diez y la identidad visible del commit.
3. Ejecuta el preflight completo de contenido, backend, TypeScript y bundle Android.
4. Espera a que el backend compartido informe ese mismo commit de `main`, el SHA-256 y la cantidad exactos del catálogo candidato, con cero audios faltantes, inválidos o con error.
5. Publica en el canal `preview` sin permitir dos publicaciones simultáneas.
6. Consulta Expo después de publicar y comprueba que Android e iOS correspondan al mismo commit.
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

Production usa una política distinta y estricta. Antes de publicar debe haber cero decisiones `pending` o `rejected`, todos los hashes y contratos deben estar vigentes y el manifiesto de recortes 4:5 debe coincidir exactamente con los archivos actuales.

Si las aprobaciones humanas se guardaron después del Preview probado, esas aprobaciones forman un commit nuevo. Intégralo en `main`, publícalo otra vez en Preview, pruébalo y usa el nuevo `Group ID`; nunca promociones el grupo anterior.

Solamente después de que el usuario apruebe explícitamente ese Preview exacto, ejecuta **Publish SpanGlish Production** desde `main`, indica el `Group ID` probado y marca la confirmación de Production. El workflow:

1. Exige el head remoto exacto y protegido de `main`.
2. Ejecuta `npm run verify:production` con la política humana estricta.
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

Para un build nativo, ejecuta **Publish SpanGlish Preview** desde el head protegido de `main` con `delivery: native-build`. El mismo gate de curso y backend verifica el candidato; EAS compila Android e iOS con el perfil interno `preview`, conserva el hash Git y lo incluye en la etiqueta de la app. El workflow comprueba el commit y ambos resultados y entrega los enlaces de instalación. Esta opción no ejecuta una OTA ni publica en Production. Instala el nuevo build: **Actualizar** no puede agregar módulos nativos.

## Si un cambio falla

No lo publiques en Production. Corrige el problema, integra otro pull request en `main` y publica otro Preview. Si un problema ya llegó a Production, usa el panel de Expo o `eas update:rollback` para regresar al update anterior.

Si Preview muestra menos de siete unidades, no muestra el commit o apunta a un commit distinto al workflow, detén las pruebas. No intentes corregirlo publicando desde otra rama: restaura el último grupo aprobado mediante el flujo protegido y registra el incidente.

## Separación futura del backend

Cuando se apruebe un segundo servicio, Preview y Production deberán usar servicios, discos, bases de datos y credenciales separados. Hasta entonces, el gate exige el mismo commit exacto de `main` y bloquea cualquier diferencia de catálogo o inventario antes de subir a Expo.
