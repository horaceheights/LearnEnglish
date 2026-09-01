# Publicar SpanGlish sin saltarse las pruebas

SpanGlish tiene dos destinos de actualización:

- **Preview:** solamente Horace. Aquí se prueba cada cambio primero y pueden aparecer advertencias por revisiones visuales humanas todavía pendientes.
- **Production:** testers internos. No recibe cambios hasta que Preview sea aprobado y todas las revisiones visuales estén vigentes.

Un push a una rama de trabajo no publica una actualización móvil. Preview se publica únicamente desde la rama protegida `release/preview`, mediante GitHub Actions y su ambiente protegido `preview-release`.

## Configuración inicial por teléfono

Preview se compila en la nube de Expo; no necesita el servidor local de Metro. Crea e instala un build una vez por plataforma:

```powershell
cd mobile
npm run build:preview -- -Platform android
npm run build:preview -- -Platform ios
```

El comando empaqueta únicamente `mobile/`. El backend, el frontend web, el historial de Git y los archivos locales de desarrollo no forman parte de la carga a Expo.

Comparte el enlace de instalación de Preview únicamente con la persona que aprueba los cambios. La app se llama **SpanGlish Preview**, se puede instalar al lado de SpanGlish Production y muestra una franja amarilla indicando que los cambios aún no llegaron a los testers.

## Flujo normal para cada cambio

No se requiere una preaprobación humana antes de implementar o publicar en Preview: Preview es el entorno normal de revisión. Solamente se agrega una preaprobación cuando Horace la pide explícitamente antes de comenzar el cambio. Los controles automáticos de integridad siguen siendo obligatorios y Production conserva su aprobación explícita separada.

### 1. Guardar el cambio

El cambio debe estar en un commit y respaldado en GitHub. Nunca se publica desde la rama de la tarea ni desde un worktree local.

Preview usa una sola autoridad canónica: `origin/release/preview`. La rama aprobada debe contener la versión vigente antes de recibir un cambio. Los controles comprueban que el candidato sea exactamente el head remoto de esa rama, conserve el curso completo de 70 lecciones y siete unidades de diez, mantenga la identidad del commit y coincida con el manifiesto de integridad versionado.

El publicador inserta automáticamente el commit corto de siete caracteres en la actualización. Ese mismo commit aparece junto a la versión en `Actualizar` y en la confirmación posterior; debe coincidir con las columnas `Commit` de Expo y Vercel.

Antes del commit, se puede ejecutar el mismo preflight que usa la publicación:

```powershell
cd mobile
npm run verify:preview
```

Este comando valida las tarjetas y sus archivos multimedia, comprueba TypeScript y exporta el bundle Android de producción en un directorio temporal.

La política de Preview permite que una decisión humana marcada `pending`, la evidencia de recorte 4:5 pendiente y una firma de renderizador obsoleta por cambios de interfaz aparezcan como advertencias. La advertencia sirve para que la revisión pueda hacerse en la app real; no significa que la imagen esté aprobada. Un rechazo, contrato o archivo ausente, hash semántico, de bytes o de vínculo de activo obsoleto que no sea solamente la firma del renderizador, copia distinta, respuesta ambigua, medio inválido o curso incompleto sigue deteniendo Preview.

### 2. Integrar en la rama protegida

Abre un pull request hacia `release/preview`. El check **Preview release integrity** debe terminar correctamente antes de integrar. No hagas force-push ni elimines la rama protegida.

### 3. Publicar solamente en Preview

En GitHub Actions, ejecuta **Publish SpanGlish Preview** desde `release/preview`. El workflow no acepta otra rama y usa el secreto `EXPO_TOKEN` del ambiente protegido `preview-release`.

El workflow:

1. Comprueba que el commit sea exactamente el head remoto de `release/preview`.
2. Valida la línea canónica, el manifiesto de integridad, 70 lecciones, siete unidades de diez y la identidad visible del commit.
3. Ejecuta el preflight completo de contenido, TypeScript y bundle Android.
4. Publica en el canal `preview` sin permitir dos publicaciones simultáneas.
5. Consulta Expo después de publicar y comprueba que el update corresponda al mismo commit.
6. No modifica `production`.

`npm run release:preview`, `eas update` y `npx eas-cli update` están prohibidos como publicación local. Si GitHub Actions o su secreto no están disponibles, la publicación queda bloqueada; no se usa la sesión local de Expo como atajo.

### 4. Probar en el teléfono

En **SpanGlish Preview**:

1. Abre Configuración.
2. Selecciona **Actualizar**.
3. Prueba el cambio y las funciones esenciales.
4. Revisa las imágenes pendientes en su encuadre real y registra las decisiones humanas sin aprobarlas automáticamente.
5. Copia el `Group ID` que mostró Expo al publicar.

### 5. Aprobar para los testers

Production usa una política distinta y estricta. Antes de promover, debe haber cero decisiones `pending` o `rejected`, todos los hashes y contratos deben estar vigentes y el manifiesto de recortes 4:5 debe coincidir exactamente con los archivos actuales. Se puede comprobar sin promover nada:

```powershell
cd mobile
npm run verify:production
```

Si las aprobaciones humanas se guardaron después del Preview probado, esas aprobaciones forman un commit nuevo. Integra y publica ese commit otra vez en Preview, pruébalo y usa el nuevo `Group ID`; nunca promociones el grupo anterior.

Solamente después de aprobar ese Preview exacto:

```powershell
npm run release:production -- -GroupId "UUID-DE-PREVIEW" -Confirm
```

El comando vuelve a ejecutar la política estricta, exige un checkout limpio y respaldado en GitHub, confirma que el ID corresponde al Preview más reciente y que sus updates inmutables de Android e iOS contienen exactamente el commit local, y después republica ese mismo bundle en `production`. No compila ni promueve archivos locales diferentes del Preview probado.

## Cuándo hace falta un build nuevo

Las modificaciones solamente de TypeScript/JavaScript, textos, lecciones, imágenes y audio normalmente usan `release:preview`.

Se necesita un build nuevo cuando cambia cualquiera de estos elementos:

- dependencias nativas o versión de Expo;
- permisos o plugins en la configuración;
- código de los módulos nativos de voz;
- versión visible de la aplicación.

En ese caso, incrementa la versión de la app y crea el build de Preview antes del build de Production.

## Si un cambio falla

No lo promociones. Corrige el problema y publica otro Preview. Si un problema ya llegó a Production, usa el panel de Expo o `eas update:rollback` para regresar al update anterior.

Si Preview muestra menos de siete unidades, no muestra el commit o apunta a un commit distinto al workflow, detén las pruebas. No intentes corregirlo publicando desde otra rama: restaura el último grupo aprobado mediante el flujo protegido y registra el incidente.

## Limitación actual del backend

Preview y Production todavía usan el mismo backend de Render. Este flujo protege las actualizaciones de la app móvil, pero los cambios del backend necesitarán posteriormente un servicio y una base de datos de staging separados antes de aceptar usuarios de pago.
