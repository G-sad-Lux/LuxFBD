# Especificación de diseño v2

Referencia visual: `capturas/`. Valores exactos: `tokens.css` y el HTML de `screens/`.

## 1. Sistema visual

Color
- Azul marino institucional `#0B1F4D`: barras laterales, panel del login administrativo, botón "Resolver ticket", títulos.
- Azul primario `#1A56C4` (hover `#15479F`): botones principales, navegación activa, enlaces.
- Naranja de acento `#E8731C`: la barra corta bajo "Tu universidad siempre contigo", el botón "Responder" del alumno y el botón "Abrir Lumix". No usarlo en más lugares.
- Fondo `#F2F5FA`, tarjetas `#FFFFFF`, borde `#DCE3EE`, borde de campos `#CBD5E4`.
- Texto `#0E1A33`, secundario `#4B5874`. Todo el texto cumple contraste 4.5:1 sobre su fondo; no aclarar los grises.

Tipografía
- Plus Jakarta Sans 400/500/600/700/800 (Google Fonts). Ver decisión D4.
- Títulos de página 26 a 32 px, peso 800. Títulos de tarjeta 15 px, peso 700. Texto 14 px. Metadatos 12 px.

Forma
- Radios: campos y botones 10 px, tarjetas 14 a 16 px, paneles grandes 20 px, pills 999 px.
- Sombras casi nulas: el diseño separa por borde, no por sombra. Solo el modal lleva sombra.
- Controles de al menos 44 px de alto en móvil (Lumix) y 40 px en escritorio.

Iconos
- Iconos de trazo (24x24, trazo 1.8, extremos redondeados), en `iconos.js`. Sustituyen los emoji de `iconoCategoria()`.
- Botones que solo tienen icono llevan `aria-label`.

Marca
- Logo: `assets/logo-lux.png` sobre fondo claro y `assets/logo-lux-blanco.png` sobre azul marino.
- Lumix: `assets/lumix.png` (cuerpo) y `assets/lumix-avatar.png` (encabezado y burbujas del chat).
- Lema en barras laterales: "TU UNIVERSIDAD SIEMPRE CONTIGO", mayúsculas, 12 px, con la barra naranja debajo.

## 2. Estados, prioridades y SLA

Estados (`.v2-badge.st-*`), pill con punto del color del texto:
- Abierto: fondo `#DDF1F6`, texto `#0B6278`. Se cambió del verde actual para que no se confunda con Resuelto.
- En Proceso: `#E3ECFB` / `#1A4FB0`.
- Esperando Respuesta: `#FDECD8` / `#9A4A00`.
- Resuelto: `#DFF3E6` / `#1D6B3A`.
- Cerrado: `#E9ECF1` / `#4B5563`.

Prioridades (`.v2-badge.pr-*`):
- Baja `#E3F2EA` / `#2F6B4F`, Media `#FBF0D2` / `#7A4F00`, Alta `#FDE6DC` / `#B23A12`, Crítica fondo sólido `#B42318` con texto blanco.
- "Por clasificar": fondo blanco, borde punteado `#9AA6BD`, texto `#4B5874`. Ver D1.

SLA (`.v2-sla`), según la regla que ya existe en `slaDe()` de `shared.js`:
- Compromisos de `prioridad_sla`: Crítica 4 h, Alta 8 h, Media 24 h, Baja 72 h.
- La barra representa el porcentaje de tiempo restante. Verde `#1F8A4C` a tiempo; naranja `#D97706` cuando queda 25 % o menos; rojo `#C0262D` vencido (barra vacía, texto "Vencido hace X h Y min" en rojo y negrita).
- Texto: "6 h 25 min restantes". En el detalle, el porcentaje va en la línea de estado ("A tiempo · 80% restante").
- Resuelto y Cerrado: el helper actual devuelve "—". El diseño muestra "Cumplido" en verde; es opcional.

## 3. Pantallas

### 3.1 Acceso del estudiante (vista de acceso de `v2/alumnos.html`)

- Encabezado blanco: logo en color, enlaces Inicio, Servicios y Ayuda, y a la derecha el botón "Acceso administrativo" que lleva a `admin.html`.
- Dos columnas:
  - Izquierda, tarjeta blanca: barra naranja, título "Portal de Atención al Estudiante", pestañas "Iniciar sesión" y "Crear cuenta", formulario, y abajo tres beneficios con icono.
  - Derecha, panel azul marino: "¿Necesitas reportar un problema?", QR en tarjeta blanca (`assets/qr-lumix.svg`, que ya apunta a la URL pública de `lumix.html`), Lumix con globo de diálogo, tres ventajas, y el botón naranja "¿Ya estás en tu celular? Abrir Lumix".
- Login: "Matrícula o correo institucional" y "Contraseña" con botón para mostrarla.
- Registro (captura 01b): Matrícula, Teléfono, Nombre completo, Correo institucional, Contraseña, Confirmar contraseña y aceptación del Aviso de Privacidad. Ver D2.
- En móvil (menos de 900 px) las columnas se apilan y el panel del QR se reduce al botón "Abrir Lumix", porque escanear el QR desde el mismo celular no tiene sentido.

### 3.2 Asistente Lumix (`v2/lumix.html`)

Lumix funciona en dos modos que comparten los mismos componentes y la misma máquina de estados:
- Modo celular (capturas 02*): pantalla completa, al que se llega escaneando el QR. En esta versión es un demo: pide solo la matrícula, sin contraseña (ver 3.7 y D5).
- Modo embebido (captura 03d): dentro del panel derecho de Mis Tickets en PC. El alumno ya tiene sesión, así que se salta la identificación. El saludo es "¡Hola, Juan! Soy Lumix. Te ayudo a registrar un nuevo reporte sin salir de Mis Tickets". No lleva botón de volver ni etiqueta DEMO, y el subtítulo dice "Nuevo reporte desde tu PC". Al generar el ticket, este aparece en la lista de la izquierda sin recargar la página.

Pantalla completa en celular (referencia de 390 x 844).
- Encabezado: botón de volver, avatar de Lumix con punto verde, "Lumix" con la etiqueta DEMO (fondo `#FDECD8`, texto `#9A4A00`), "En línea · Soporte Universidad Lux" y botón de reiniciar conversación.
- Primer mensaje: "¡Hola! Soy Lumix, tu asistente de soporte. Para comenzar, escribe tu matrícula". Debajo, el aviso punteado "Versión demo: basta con tu matrícula, sin contraseña". El campo de texto muestra "Escribe tu matrícula…" como marcador.
- Burbujas:
  - Lumix: blancas con borde, esquina superior izquierda recta, avatar a la izquierda.
  - Alumno: azul primario con texto blanco, esquina superior derecha recta.
  - Hora debajo de cada burbuja, 11 px.
- Opciones rápidas: botones en cuadrícula de 2 columnas, alineados con el texto de la burbuja (sangría de 38 px), de al menos 44 px de alto. La opción principal va rellena de azul.
- Flujo (misma máquina de estados que ya existe):
  1. Identificación con matrícula (solo en modo celular y demo).
  2. Saludo con el nombre del alumno y las opciones "Reportar un problema" y "Consultar mi ticket".
  3. Título del problema.
  4. Categoría: 6 opciones con icono (Acceso y bloqueos, Plataforma virtual, Materias, Servicios escolares, Finanzas y pagos, Otros).
  5. Descripción.
  6. Área relacionada (Soporte Técnico, Servicios Escolares, Cajas, "No estoy seguro").
  7. Evidencia: adjuntar archivo, tomar foto o continuar sin evidencia (PNG, JPG o PDF de hasta 5 MB, igual que la validación actual).
  8. Resumen para confirmar o editar, con la nota "La prioridad la asigna el equipo de soporte".
  9. Tarjeta de éxito con el folio y el estado Abierto, y los botones "Ver en Mis Tickets" y "Reportar otro problema". En modo embebido, el primer botón dice "Ver en mi lista".
- Nunca se pregunta la prioridad (§5.3).
- Consultar (captura 02d): tarjetas compactas de los tickets activos. La de Esperando Respuesta lleva borde naranja y una línea que dice qué información falta.
- Barra inferior: campo en forma de pill con botones de adjuntar y cámara, y botón circular de enviar (gris cuando no hay texto).

### 3.3 Mis Tickets (`v2/alumnos.html`)

- Estructura en tres zonas:
  - Encabezado blanco: logo, "Portal de Atención al Estudiante", campana con contador, iniciales, nombre y matrícula, y "Cerrar sesión".
  - Barra lateral azul marino de 216 px: Mis Tickets, Nuevo reporte, Ayuda y Mi perfil; abajo, la tarjeta "¿Necesitas ayuda?" con Lumix y el lema.
  - Panel de detalle a la derecha, de 380 px.
- Contadores: Tickets activos (Abierto, En Proceso y Esperando Respuesta), Esperando tu respuesta (tarjeta con borde naranja) y Resueltos y cerrados.
- Filtros: búsqueda por folio o título, Estado, Categoría y Fecha.
- Tarjeta de ticket (cuadrícula de 4 columnas):
  - icono de la categoría;
  - folio y título en una línea, y debajo categoría, fecha de creación y área responsable ("Por asignar" si no hay);
  - pill de estado con la última actualización;
  - acción: "Ver detalle", o "Responder" en naranja si el ticket está en Esperando Respuesta.
- La tarjeta seleccionada lleva borde azul de 2 px.
- El panel derecho tiene arriba un control segmentado de 60 px de alto, con fondo `#EEF2F8`, y dos pestañas:
  - "Ticket #ID": el detalle del ticket seleccionado.
  - "Hablar con Lumix" (con el avatar): Lumix en modo embebido, a todo el alto del panel.
- Hacer clic en una tarjeta, en "Ver detalle" o en "Responder" regresa a la pestaña del ticket.
- "Reportar nuevo problema", "Nuevo reporte" en la barra lateral, "Hablar con Lumix" en la tarjeta de la barra lateral y el enlace de tickets cerrados abren la pestaña de Lumix. Ya no navegan a otra página.
- Panel de detalle:
  - folio, estado, título, y categoría, área y fecha de creación;
  - "Seguimiento": línea de tiempo con los 5 estados. Completados con check verde, el actual con anillo azul, pendientes con círculo gris; la fecha de cada uno sale de `historial`;
  - "Conversación con soporte", con la línea "Atiende: {nombre del responsable} · {área}" (o "Por asignar · el equipo lo revisará pronto"). Solo muestra los comentarios públicos; las notas internas nunca se consultan ni se pintan en esta página. La etiqueta de la caja de respuesta dice "Mensaje para {nombre}" y el marcador "Escribe a {nombre}…", para que quede claro que el mensaje llega al encargado;
  - si hay resolución, un recuadro verde "Solución registrada" con `resumen_solucion`;
  - caja de respuesta con adjunto (PNG, JPG o PDF). En Esperando Respuesta lleva arriba un aviso naranja con lo que pidió soporte. En Resuelto y Cerrado se sustituye por el texto "Este ticket ya fue atendido…" con enlace a Lumix.

### 3.4 Login administrativo (vista de acceso de `v2/admin.html`)

- Panel izquierdo azul marino de 620 px: logo en blanco, "Gestión de Incidencias", tres funciones (Prioridad y SLA, Asignación por área, Trazabilidad completa) y el lema.
- Tarjeta de acceso:
  - pill "Acceso restringido";
  - campos "Usuario institucional" y "Contraseña";
  - botón azul marino "Ingresar al panel";
  - aviso informativo "Tu rol (Administrador o Soporte) se valida al iniciar sesión".
- Sin selector de rol: el rol lo determina el backend.
- Error (captura 04b): banner rojo "Credenciales incorrectas o la cuenta no tiene un rol autorizado para este portal". Mismo mensaje para ambos casos, para no revelar qué falló.
- Debajo de la tarjeta: enlace al Portal del Estudiante y la línea "Conexión cifrada (HTTPS) · Los inicios de sesión quedan registrados en la bitácora".

### 3.5 Dashboard (`v2/admin.html`)

- Barra lateral azul marino de 224 px: Dashboard, Tickets, Reportes, Catálogos, Usuarios y roles, Configuración. Mostrar solo lo que el rol puede usar; Soporte no ve Usuarios y roles ni Configuración.
- Encabezado: "Gestión de Incidencias", búsqueda global, campana, usuario con rol y "Cerrar sesión".
- Título "Panel de incidencias", fecha y hora de actualización, y la leyenda del semáforo de SLA.
- 6 KPI en una fila, todos de las vistas de KPI existentes:
  - Abiertos;
  - En proceso;
  - Por vencer SLA (borde naranja);
  - Alta y crítica pendientes (borde rojo);
  - Sin asignar;
  - Resueltos hoy, con los de la semana como dato secundario.
- Tarjeta de la tabla:
  - vistas rápidas en control segmentado: Todos, Sin asignar, Riesgo de SLA (por vencer y vencidos), Alta y crítica;
  - botón Exportar;
  - filtros: búsqueda, Estado, Categoría, Prioridad, Responsable y Fecha, con botón "Aplicar".
- Columnas de la tabla:
  - Folio y fecha, apilados;
  - Estudiante y matrícula;
  - Asunto, con categoría y canal debajo (Lumix o Portal web, con icono);
  - Prioridad;
  - Estado;
  - Responsable y área, o el botón punteado "Clasificar" si no tiene asignación;
  - SLA;
  - Botón para abrir el detalle.
- Paginación al pie: "Mostrando 1–8 de N tickets".

### 3.6 Detalle del ticket (`v2/admin.html#ticket=ID`)

- Ruta de navegación "Tickets > #ID" y "Volver al panel".
- Encabezado: "Ticket #ID", pill de estado, pill de prioridad y título.
- Franja de datos en 5 columnas: Estudiante, Categoría (con el área sugerida por el alumno), Creado (y hace cuánto), Canal y Responsable.
- Columna izquierda:
  - "Descripción original" y "Evidencias": miniaturas con nombre, tamaño, fecha y botón de ver, que abre el lightbox existente. Etiqueta "Acceso protegido".
  - Tarjeta con pestañas "Conversación" y "Bitácora de auditoría (N)".
  - Conversación: los eventos del sistema van como separadores centrados. El alumno aparece a la izquierda en gris y el staff a la derecha en azul claro. La nota interna va en `#FFF4E5` con borde punteado `#D98B2B`, candado y la leyenda "No visible para el estudiante".
  - Bitácora: tabla de Fecha y hora, Usuario y Evento, lo más reciente arriba.
  - Caja de redacción:
    - selector "Respuesta pública / Nota interna";
    - en Nota interna el fondo cambia a `#FFF4E5`, el botón a "Guardar nota" en `#9A4A00`, y la leyenda a "Solo personal autorizado · no visible para el estudiante";
    - en Respuesta pública, la casilla "Solicitar información y cambiar a Esperando Respuesta".
- Columna derecha, de 348 px:
  - Gestión del ticket: Estado, Prioridad administrativa (con el texto de criterios del §10), Área responsable y Técnico.
  - Bloque de SLA con tiempo restante, barra y fecha límite. Si cambia la prioridad, se agrega la línea "SLA recalculado por cambio de prioridad; el cambio quedó en la bitácora".
  - Botones "Resolver ticket" (azul marino, con el subtítulo "Requiere resumen de la solución") y "Reasignar a otra área".
  - Tarjeta del estudiante con sus otros tickets activos.
- Modal "Resolver ticket" (captura 06d):
  - campo "Resumen de la solución" obligatorio, con el texto "Campo obligatorio" en rojo mientras esté vacío;
  - aviso de que el alumno verá el resumen;
  - botones "Cancelar" y "Marcar como Resuelto", este último deshabilitado hasta que haya texto.
  - Si en el selector de Estado eligen "Resuelto", se abre este modal en lugar de cambiar el estado directamente.
- Después de resolver: el bloque de botones se sustituye por "Resolución final", con el resumen y el botón "Cerrar ticket".

### 3.7 Flujo QR (demo), captura 07

1. El Portal del Estudiante en la PC muestra el QR, sin necesidad de sesión.
2. La cámara del celular abre `v2/lumix.html?origen=qr` a pantalla completa.
3. Lumix pide la matrícula, busca al alumno y lo saluda por su nombre (02a y 02b). No pide contraseña.
4. Reporte guiado (02c).
5. Se crea el ticket en estado Abierto, con `canal_entrada = 'lumix'` y sin prioridad hasta que soporte la asigne (02).
6. Seguimiento en Mis Tickets, en celular o en PC.

El botón "¿Ya estás en tu celular? Abrir Lumix" del acceso de escritorio y el de "Reportar con Lumix" del acceso móvil llevan a este mismo flujo.

### 3.8 Portal en el celular (menos de 600 px), capturas 08 a 10

Es la misma `v2/alumnos.html`, en versión responsiva.
- Acceso (08):
  - cabecera azul marino con el logo en blanco, "Portal de Atención al Estudiante" y Lumix asomándose a la derecha;
  - login con matrícula o correo y contraseña, con campos de 50 px y texto de 16 px (así iOS no hace zoom al tocarlos);
  - botón "Ingresar" y, después de un separador "o también", un botón secundario "Reportar con Lumix".
- Mis Tickets (09):
  - encabezado con logo, campana e iniciales;
  - saludo y 3 contadores compactos;
  - filtros en chips con desplazamiento horizontal: Todos, Activos, Esperando y Resueltos, cada uno con su número;
  - tarjetas de ancho completo, con los tickets en Esperando Respuesta primero, borde naranja y una franja "{Encargado} espera tu comprobante" (o lo que haya pedido);
  - barra inferior de 76 px: Mis Tickets, Lumix al centro en un botón circular elevado de 58 px y Mi perfil.
- Detalle (10):
  - encabezado con volver, folio y estado;
  - título y chips de categoría, encargado y fecha;
  - barra de avance de 5 segmentos: verde los completados, naranja si el actual es Esperando Respuesta y azul si es En Proceso. Debajo, el texto "Paso N de 5 · estado · siguiente: …";
  - "Conversación con {encargado}", con los eventos como separadores y las burbujas del encargado a la izquierda y las del alumno a la derecha;
  - en Esperando Respuesta, un aviso naranja fijo arriba de la caja de mensaje y la vista previa del archivo adjunto, que se puede quitar;
  - al enviar (10b), la respuesta aparece con el adjunto, un separador "Tu respuesta regresó el ticket a En Proceso" y el estado y la barra se actualizan. Es la transición Esperando Respuesta → En Proceso de `cambiar_estado()`.

## 4. Decisiones pendientes

- D1. Prioridad inicial. `PLAN_V2.md` dice que la prioridad oficial nace como "Baja" hasta que el staff la fije. El diseño muestra "Por clasificar" y "Sin prioridad" en el SLA mientras nadie la haya revisado. Para hacerlo se necesita saber si el staff ya fijó la prioridad, por ejemplo con un evento en `historial` o una columna `prioridad_fijada_en`. Si no se hace, esos tickets se muestran como "Baja". Pendiente.
- D2. Registro self-service. `PLAN_V2.md` recomienda mantener el alta administrada. Si se mantiene, la pestaña "Crear cuenta" se oculta o se convierte en un enlace "Solicitar acceso" con instrucciones. Pendiente.
- D3. SLA en Esperando Respuesta. El diseño sigue contando el tiempo; el documento no dice si se pausa. Pendiente.
- D5. Identificación del demo por QR. Identificar solo con la matrícula permite reportar a nombre de otro alumno. Para el demo se acepta, con la etiqueta DEMO visible. Hay que decidir cómo se implementa sin abrir un hueco en RLS; por ejemplo, un usuario demo o una Edge Function que valide la matrícula y cree el ticket con el service role solo si el interruptor de demo está encendido. Fuera del demo, este paso debe pedir inicio de sesión (el flujo actual de `index.html?volver=lumix`). Pendiente.
- D4. Tipografía. El diseño usa Plus Jakarta Sans y `shared.css` usa Space Grotesk. Cambiarla es una línea en el `<link>` de Google Fonts y otra en `body`. Pendiente.

## 5. Accesibilidad

- Elementos nativos: `<button>`, `<a href>`, `<input>` con `<label>` y `<select>`. Nada de `onclick` en `div`.
- Pestañas con `role="tablist"` y `role="tab"`. El modal lleva `role="dialog"` y `aria-modal`, y el foco se queda dentro mientras está abierto.
- El color nunca es la única señal: los estados llevan texto, el SLA lleva texto y la nota interna lleva candado y leyenda.
