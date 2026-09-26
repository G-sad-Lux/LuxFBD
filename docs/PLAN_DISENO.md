# Plan de implementación — Diseño High Fidelity (design-handoff)

**Fecha:** 26 de septiembre de 2026 · **Fuente:** [`design-handoff/`](../design-handoff/) (Claude Design, 6 pantallas de la §20 del doc + specs + tokens + iconos + assets con la mascota real).
**Objetivo:** reestilizar la V2 para calcar las capturas, **sin tocar la v1, el interruptor, la lógica de datos ni las migraciones** (salvo los puntos backend aprobados abajo).
**Ejecución:** en un chat nuevo — arrancar leyendo `design-handoff/README.md`, `design-handoff/specs.md` y **este plan** (las decisiones D1-D4 ya están resueltas aquí).

---

## Por qué es bajo riesgo

- `tokens.css` redefine **las mismas variables** `--v2-*` y clases `.v2-badge.st-*` / `.pr-*` / `.v2-sla` que ya usa `shared.css` → gran parte del recolor es reemplazo directo.
- `iconos.js` indexa los iconos de categoría **por `codigo` del catálogo** (0014) y los de canal por nuestro enum — sustituye 1:1 a `iconoCategoria()`.
- Los assets incluyen la **mascota Lumix real** y el logo oficial (cierra el cosmético que faltaba).
- specs.md §3.2 confirma "misma máquina de estados que ya existe"; el flujo de datos no cambia.

## Reglas del trabajo (del README, obligatorias)

1. **Una página a la vez**; al terminar cada una: `npm run dev`, comparar contra su captura, reportar diferencias, commit.
2. v1 e interruptor intactos; CSP respetada (fuentes solo Google Fonts); `esc()` y llamadas API se conservan — cambia estructura HTML y estilos, no el flujo.
3. Si una pantalla pide un dato que el backend no da y no está en la lista aprobada de abajo → **detenerse y preguntar**.
4. Datos de `screens/` son de ejemplo; siempre datos reales.

## Fases

### F-D0 · Cimientos (≈½ día)
- Copiar `design-handoff/assets/` → `v2/assets/` (logo color/blanco, `lumix.png`, `lumix-avatar.png`; el QR ya existe).
- Integrar `tokens.css` **dentro** de `v2/shared.css` (reemplazar valores de las variables/badges/SLA existentes y agregar los nuevos `--v2-navy`, `--v2-accent`, radios, nota interna). No es hoja adicional.
- Tipografía según D4 (abajo) en el `<link>` de las 4 páginas v2 + `body`.
- `shared.js`: cargar `LuxIconos` (copiar `iconos.js` a `v2/`) y reescribir `iconoCategoria()` → SVG de trazo (`.v2-ico`); agregar helper de icono de canal.
- Sombra fuera, bordes dentro (`--v2-shadow: none`); verificación: las 4 páginas cargan, interruptor y v1 intactos.

### F-D1 · `v2/admin.html` (≈2 días) — capturas 04, 05, 06
- **Vista de acceso** (04): panel azul marino izquierdo (logo blanco, 3 funciones, lema con barra naranja) + tarjeta con pill "Acceso restringido", login embebido (`signInWithPassword` ahí mismo), aviso "tu rol se valida al iniciar sesión", **banner único de error** (mismo texto para credencial mala o rol no autorizado — ya alineado con nuestros errores genéricos), enlace al portal del estudiante y línea HTTPS/bitácora.
- **Layout**: barra lateral azul marino 224 px (Dashboard, Tickets, Reportes reales; ver "Sidebar" abajo) + encabezado con búsqueda global (alimenta el filtro del dashboard), campana, usuario+rol.
- **Dashboard** (05): 6 KPI con bordes semánticos (por vencer naranja, alta/crítica rojo; resueltos hoy con "de la semana" como secundario — backend B2), leyenda del semáforo, **vistas rápidas segmentadas** (Todos / Sin asignar / Riesgo SLA / Alta y crítica), botón **Exportar** (CSV client-side del filtrado), filtros con botón "Aplicar", tabla con columnas apiladas (folio+fecha; estudiante+matrícula-correo; asunto+categoría+canal con icono), botón punteado **"Clasificar"** cuando no hay asignación (es la acción de asignar responsable; sin backend), paginación "Mostrando 1–8 de N".
- **Detalle** (06): breadcrumb + franja de 5 datos (incl. "hace cuánto" relativo y área sugerida por el alumno = `prioridad_reportada`/área), pestañas **Conversación / Bitácora de auditoría (N)** (eventos del sistema como separadores centrados; nota interna con candado y leyenda), caja de redacción con modo Nota interna (fondo `--v2-internal-*`, botón "Guardar nota") y casilla **"Solicitar información y cambiar a Esperando Respuesta"** (= POST comentario + PUT estado 3), columna derecha de gestión con criterios del §10, bloque SLA (+ línea "SLA recalculado…" tras cambiar prioridad), **modal "Resolver ticket"** (obligatorio, botón deshabilitado sin texto; elegir "Resuelto" en el select abre el modal), bloque "Resolución final" + "Cerrar ticket", tarjeta del estudiante con **sus otros tickets activos** (filtrado client-side de `/list`, sin backend).

### F-D2 · `v2/alumnos.html` (≈1.5 días) — capturas 01, 03
- **Vista de acceso** (01): encabezado blanco con "Acceso administrativo" → `admin.html`; dos columnas — tarjeta con pestañas (Iniciar sesión / **según D2**), login "Matrícula o correo" con mostrar-contraseña, 3 beneficios; panel azul marino con QR en tarjeta, **mascota Lumix real** con globo, 3 ventajas y botón naranja "Abrir Lumix". Móvil <900 px: columnas apiladas y el QR se reduce al botón (escanear desde el mismo celular no aplica).
- **Mis Tickets** (03): barra lateral 216 px (Mis Tickets, Nuevo reporte→Lumix, Ayuda, Mi perfil — los dos últimos según nota "Sidebar") + tarjeta "¿Necesitas ayuda?" con Lumix; encabezado con matrícula; contadores (Esperando con borde naranja); tarjeta de ticket en cuadrícula de 4 columnas con icono SVG, pill de estado + última actualización, acción "Responder" naranja; **tarjeta seleccionada con borde azul**; panel de detalle fijo de 380 px (en vez de vista aparte): seguimiento con los **5 estados** (fechas desde `historial` — ya llega en `/details`), solo mensajes públicos, recuadro verde "Solución registrada", caja de respuesta con estados (aviso naranja en Esperando; texto de cerrado con enlace a Lumix en Resuelto/Cerrado).

### F-D3 · `v2/lumix.html` (≈1 día) — capturas 02
- Restyle completo: avatar real con punto verde, burbujas con esquina recta y **hora**, opciones en cuadrícula de 2 columnas con sangría de 38 px y ≥44 px de alto (la principal rellena), barra inferior en pill con adjuntar/cámara y enviar circular, botón de **reiniciar conversación**.
- Flujo: mantener la máquina actual y **agregar el paso de resumen para confirmar/editar** antes de crear (nota "la prioridad la asigna soporte"); tarjeta de éxito con botones del diseño; "Consultar": tarjetas compactas con borde naranja en Esperando Respuesta + qué información falta (último comentario de soporte).
- Identificación (paso 1 del diseño): se cubre **por sesión** — con sesión, saludo con nombre directo (paso 2); sin sesión, pantalla de acceso → login. No se pregunta matrícula por chat (decisión de seguridad vigente).

### F-D4 · QA integral (≈½ día)
- Comparación página-vs-captura de los 12 estados capturados; regresión: interruptor on/off, v1 intacta, Realtime, CSAT, suite verde (131+); commit final y push.

**Total estimado: ~5 días de trabajo.**

## Backend aprobado para esta implementación (mínimo)

| # | Necesidad del diseño | Cambio |
|---|---|---|
| ~~B1~~ | ~~"Por clasificar"~~ | **Cancelado por D1**: ningún ticket nace sin prioridad; cero cambios de backend |
| B2 | KPI "Resueltos hoy" con secundario "de la semana" | `v_kpi_resumen` + columna `resueltos_semana` (CREATE OR REPLACE, columna al final) |
| — | Nada más. Cualquier otro dato faltante → preguntar antes. | |

## Decisiones (resueltas — ver respuestas del equipo al final)

- **D1 Prioridad inicial** → Todo ticket **nace con prioridad** (regla del equipo): se mantiene el comportamiento actual (Baja por defecto; en v1 la percibida) y soporte la ajusta. El estado "Por clasificar" del diseño **no se implementa** y la migración B1 queda cancelada; el pill muestra siempre la prioridad vigente.
- **D2 Pestaña "Crear cuenta"** → La pestaña "Crear cuenta" se **oculta por lo pronto** (alta administrada). Registrada para **análisis técnico posterior** la idea del equipo: sesión temporal de hasta 72 h generada vía QR para usuarios aún no dados de alta (candidata: anonymous sign-in de Supabase + expiración).
- **D3 SLA en Esperando Respuesta** → El SLA **no se pausa** durante "Esperando Respuesta" (el reloj sigue; sin cambios de backend).
- **D4 Tipografía Plus Jakarta Sans** → **Plus Jakarta Sans** en toda la V2 (la v1 conserva Space Grotesk).

## Notas de conflicto con lo ya construido (resueltas en este plan)

1. **Login embebido en cada página v2** (pantallas 01/04) refina la decisión previa de "login único": sigue habiendo *una sola* autenticación (Supabase Auth) y el rol lo valida el backend; lo que cambia es que cada portal tiene su propia *vista* de acceso con el diseño. El login v1 del Campus queda intacto para la experiencia clásica; `?volver=` deja de ser necesario para v2 (cada página se autentica in-situ).
2. **Sidebar con Catálogos / Usuarios y roles / Configuración**: esas pantallas no existen ni están especificadas → la barra muestra solo las reales (Dashboard, Tickets, Reportes en admin; Mis Tickets y Nuevo reporte en alumnos). "Ayuda" y "Mi perfil" del alumno: entradas presentes pero llevando a contenido mínimo (Ayuda → tarjeta con Lumix; Mi perfil → datos de sesión). Si el equipo quiere las pantallas admin extra, son fase aparte.
3. **Identificación en Lumix**: por sesión (nota en F-D3), no por matrícula en chat.
4. El botón **"Reasignar a otra área"** usa el select de área ya existente (D6 previo) con el estilo del diseño.

## Al terminar

Actualizar `docs/PLAN.md` (marcar la fase de diseño), capturas nuevas para el `.docx`, y considerar **encender la V2 por default** — con este diseño, es la cara del Premio Idea.
