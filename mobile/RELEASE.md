# Publicar SpanGlish sin saltarse las pruebas

SpanGlish tiene dos destinos de actualización:

- **Preview:** solamente Horace. Aquí se prueba cada cambio primero.
- **Production:** testers internos. No recibe cambios hasta que Preview sea aprobado.

Un push a GitHub no publica una actualización móvil. La publicación ocurre solamente mediante los comandos descritos aquí.

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

### 1. Guardar el cambio

El cambio debe estar en un commit y respaldado en GitHub. El comando se detendrá si encuentra archivos sin commit o un commit que todavía no se ha subido.

Preview también usa una sola línea canónica: `origin/codex/restore-complete-a1-preview`. Antes de publicar desde otra rama, integra primero la versión más reciente de esa línea. El guard de publicación bloquea ramas divergentes para impedir que una actualización nueva quite unidades o funciones ya aprobadas.

Antes del commit, se puede ejecutar el mismo preflight que usa la publicación:

```powershell
cd mobile
npm run verify:preview
```

Este comando valida las tarjetas y sus archivos multimedia, comprueba TypeScript y exporta el bundle Android de producción en un directorio temporal.

### 2. Publicar solamente en Preview

```powershell
cd mobile
npm run release:preview -- -Message "Descripción breve del cambio"
```

Este comando:

1. Comprueba que Git esté limpio y respaldado en GitHub.
2. Ejecuta el preflight completo de contenido, TypeScript y bundle Android.
3. Publica en el canal `preview`.
4. No modifica `production`.

### 3. Probar en el teléfono

En **SpanGlish Preview**:

1. Abre Configuración.
2. Selecciona **Actualizar**.
3. Prueba el cambio y las funciones esenciales.
4. Copia el `Group ID` que mostró Expo al publicar.

### 4. Aprobar para los testers

Solamente después de aprobar Preview:

```powershell
npm run release:production -- -GroupId "UUID-DE-PREVIEW" -Confirm
```

El comando confirma que el ID corresponde al Preview más reciente y luego republica ese mismo bundle en `production`. No vuelve a compilar los archivos locales.

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

## Limitación actual del backend

Preview y Production todavía usan el mismo backend de Render. Este flujo protege las actualizaciones de la app móvil, pero los cambios del backend necesitarán posteriormente un servicio y una base de datos de staging separados antes de aceptar usuarios de pago.
