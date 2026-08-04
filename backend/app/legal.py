import html
import os


SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "gorreonazul@gmail.com").strip()


def _support_contact() -> str:
    if SUPPORT_EMAIL:
        safe_email = html.escape(SUPPORT_EMAIL)
        return f'<a href="mailto:{safe_email}">{safe_email}</a>'
    return "el correo de soporte publicado en nuestra ficha de Google Play"


def _page(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)} | SpanGlish</title>
  <style>
    :root {{ color-scheme: light; font-family: Arial, sans-serif; color: #24333a; background: #fbf7ef; }}
    body {{ margin: 0; }}
    main {{ box-sizing: border-box; margin: 0 auto; max-width: 820px; min-height: 100vh; padding: 42px 22px 64px; }}
    header {{ background: #163b5c; border-radius: 24px; color: white; padding: 28px; }}
    header p {{ color: #f6cb52; font-weight: 700; letter-spacing: .08em; margin: 0 0 8px; text-transform: uppercase; }}
    h1 {{ font-size: clamp(30px, 6vw, 46px); margin: 0; }}
    article {{ background: white; border: 1px solid #e7ded0; border-radius: 24px; margin-top: 20px; padding: 28px; }}
    h2 {{ color: #176f73; font-size: 21px; margin-top: 30px; }}
    h2:first-child {{ margin-top: 0; }}
    p, li {{ font-size: 16px; line-height: 1.65; }}
    a {{ color: #176f73; font-weight: 700; }}
    .note {{ background: #fff1d5; border-left: 5px solid #e5ad3d; border-radius: 8px; padding: 14px 16px; }}
    footer {{ color: #657178; font-size: 13px; padding: 22px 4px; text-align: center; }}
  </style>
</head>
<body><main><header><p>SpanGlish</p><h1>{html.escape(title)}</h1></header><article>{body}</article>
<footer>Última actualización: 4 de agosto de 2026</footer></main></body>
</html>"""


def privacy_policy_html() -> str:
    return _page(
        "Política de privacidad",
        f"""
<h2>Quiénes somos</h2>
<p>SpanGlish es una aplicación educativa para practicar inglés. Esta política explica qué información procesa la aplicación, para qué se utiliza y qué opciones tienes.</p>

<h2>Información que procesamos</h2>
<ul>
  <li><strong>Perfil:</strong> nombre visible, identificador interno y preferencias del perfil.</li>
  <li><strong>Actividad de aprendizaje:</strong> lecciones visitadas, respuestas, intentos, resultados, progreso y fechas de actividad.</li>
  <li><strong>Pronunciación:</strong> grabaciones de voz que decides enviar para recibir una evaluación.</li>
  <li><strong>Datos técnicos:</strong> versión de la aplicación, tipo de dispositivo, sistema operativo, identificadores técnicos, fallos, rendimiento y diagnóstico.</li>
</ul>

<h2>Cómo usamos la información</h2>
<p>La usamos para guardar tu progreso, calificar ejercicios, evaluar pronunciación, operar y proteger el servicio, investigar errores y mejorar el funcionamiento de la aplicación.</p>

<h2>Pronunciación y audio</h2>
<p>Cuando utilizas la práctica de pronunciación, el audio se transmite cifrado a nuestros servicios y a Microsoft Azure Speech para generar el resultado. SpanGlish procesa ese audio para responder a la solicitud y no lo conserva intencionalmente en su base de datos de progreso.</p>

<h2>Proveedores</h2>
<p>Utilizamos proveedores que procesan información por cuenta de SpanGlish, incluidos Render para infraestructura y base de datos, Microsoft Azure Speech para pronunciación, Sentry para diagnóstico y rendimiento, y Expo/EAS para crear y distribuir la aplicación y sus actualizaciones. Cada proveedor puede conservar datos técnicos conforme a sus propias políticas y obligaciones de seguridad.</p>

<h2>Diagnóstico y reproducción de sesiones</h2>
<p>Sentry puede recibir fallos, métricas de rendimiento y reproducciones técnicas asociadas a un error. Configuramos la reproducción para ocultar texto, imágenes y gráficos de la interfaz. No usamos estos datos con fines publicitarios.</p>

<h2>Venta, publicidad y seguridad</h2>
<p>No vendemos información personal ni mostramos anuncios actualmente. La información transmitida por la aplicación viaja mediante conexiones HTTPS cifradas.</p>

<h2>Conservación y eliminación</h2>
<p>Conservamos el perfil y la actividad de aprendizaje mientras el perfil permanezca activo. Puedes eliminarlos desde la aplicación. Algunos registros técnicos pueden conservarse durante periodos limitados por seguridad, prevención de abuso u obligaciones del proveedor.</p>
<p>Consulta las <a href="/delete-account">instrucciones para eliminar tu perfil y tus datos</a>.</p>

<h2>Edad</h2>
<p>SpanGlish está dirigido a personas de 13 años o más. No recopilamos intencionalmente datos personales de menores de 13 años.</p>

<h2>Contacto</h2>
<p>Para preguntas sobre privacidad, escribe a {_support_contact()}.</p>
""",
    )


def account_deletion_html() -> str:
    return _page(
        "Eliminar tu perfil y tus datos",
        f"""
<h2>Eliminación desde SpanGlish</h2>
<p>Puedes solicitar la eliminación directamente desde la aplicación:</p>
<ol>
  <li>Abre SpanGlish y entra a tu perfil.</li>
  <li>En la pantalla principal, toca el botón circular de perfil que aparece junto al saludo.</li>
  <li>Toca <strong>Eliminar mi perfil y mis datos</strong>.</li>
  <li>Confirma <strong>Eliminar definitivamente</strong>.</li>
</ol>
<p class="note"><strong>Esta acción es permanente.</strong> Una vez confirmada, se elimina el perfil del alumno y se cierra la sesión local en el dispositivo.</p>

<h2>Qué información se elimina</h2>
<ul>
  <li>El nombre visible, identificador interno y preferencias del perfil.</li>
  <li>El progreso, las visitas y resultados de las lecciones.</li>
  <li>Los intentos y respuestas registrados para ese perfil.</li>
</ul>

<h2>Información que no forma parte del perfil</h2>
<p>SpanGlish no conserva intencionalmente las grabaciones de pronunciación en su base de datos de progreso. Los proveedores de diagnóstico e infraestructura pueden conservar registros técnicos limitados durante el periodo establecido por sus políticas o por obligaciones de seguridad.</p>

<h2>Si no puedes abrir la aplicación</h2>
<p>Solicita la eliminación mediante {_support_contact()}. Indica el nombre exacto de tu perfil de SpanGlish para que podamos localizarlo. Podemos pedir información adicional únicamente para confirmar que la solicitud corresponde al perfil correcto.</p>

<p><a href="/privacy">Leer la política de privacidad</a></p>
""",
    )
