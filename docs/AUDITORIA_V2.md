# Auditoría de conformidad — Documento V2 vs. implementación actual

**Fecha:** 26 de septiembre de 2026 · **Base:** documento V2 (23 secciones, 7 figuras) contra `master` (`df70646`) con F0-F3 construidas y F2 verificada en vivo.
**Leyenda:** ✅ cumple · ⚠️ parcial · ❌ falta · 🔀 divergencia deliberada (decisión documentada del equipo)

---

## 1. Conformidad por sección del documento

| § | Requisito | Estado | Nota |
|---|---|---|---|
| 3 | Portal web: autenticarse, registrar, **adjuntar evidencias**, consultar | ⚠️ | Todo ✅ salvo adjuntar desde el portal (solo el chat v1 sube archivos) → **D3** |
| 3/5 | Asistente Lumix móvil + acceso por QR | ❌ | Fase F4 planeada; el chat v1 cubre el flujo conversacional mientras tanto |
| 4.2 | Registro self-service (matrícula, nombre, correo, teléfono) | 🔀 | Decisión 2026-09-26: alta administrada por seguridad (F1 de la auditoría de seguridad) |
| 5.3 | Registro guiado: título, categoría, descripción, área, evidencias | ✅ | Chat v1 completo; portal v2 sin evidencias (→D3) |
| 5.3 | Catálogo de categorías sugerido (Acceso y bloqueos, Plataforma virtual, Materias, Servicios escolares, Finanzas y pagos, **Otros**) | ⚠️ | El catálogo real difiere: Finanzas, Sitio Web, Servo Web, Materias, Bloqueos/Acceso. Falta "Otros"; "Servicios escolares" existe como ÁREA, no como categoría. El doc usa lenguaje suave ("podrán contemplar") → **D8, decisión** |
| 5.3 | El estudiante NO establece prioridad | ✅ | Portal v2 no la pregunta; el chat v1 la guarda como *percibida* (por diseño del interruptor) |
| 5.4 | Evidencias PNG/JPG/PDF con restricciones | ✅ | Bucket: 5 MB, image/* + PDF, privado |
| 5.5 | Folio único + estado inicial Abierto + confirmación | ✅ | Verificado en vivo (ticket #2) |
| 6 | Mis Tickets: número, título, fecha, categoría, estado, área/responsable, **última actualización** | ⚠️ | Todo ✅ menos "última actualización" (no existe el dato) → **D5** |
| 6 | Responder cuando soporte pida información **y agregar evidencias** | ⚠️ | Responder ✅ (con retorno automático a En proceso); adjuntar en la respuesta ❌ → D3 |
| 7 | Capacidades del módulo admin (11 ítems) | ✅ | 10/11; "clasificar" como cambio de categoría no existe (solo prioridad) → menor, ver D6 |
| 8 | Portal de acceso independiente para staff | ⚠️ | admin.html existe pero reutiliza el login v1 → **D2** |
| 8 | RBAC servidor (estudiantes fuera del portal admin) | ✅ | RLS + guard; verificado en vivo con sesión de alumno |
| 9 | KPIs: abiertos, **en proceso**, por vencer, alta prioridad, sin asignar, resueltos hoy | ⚠️ | 6 tarjetas ✅; "En proceso" existe en la vista SQL pero no se muestra como tarjeta → **D9** (1 línea) |
| 9 | Tabla: 11 columnas | ✅ | Todas presentes; "Acciones" es clic-en-fila (→D11 menor) |
| 9 | Filtros: estado, categoría, prioridad, responsable, **rango de fechas** | ⚠️ | 4/5; fechas ❌ → **D4** |
| 9 | Búsqueda: folio, **matrícula**, nombre | ⚠️ | Folio/título/nombre ✅; matrícula ❌ (el dato no existe como columna) → **D7** |
| 10 | Prioridad solo staff · 4 niveles · SLA por prioridad · recálculo + bitácora | ✅ | Verificado en suite (106 checks) y en vivo |
| 11 | Asignar a técnico **o área** · reasignar a otro departamento con trazabilidad | ⚠️ | Técnico ✅ con bitácora; **cambiar el área desde gestión ❌** y el trigger no audita cambios de área → **D6** |
| 11 | Áreas: Soporte Técnico, Servicios Escolares, Cajas, Administración | ✅ | Sembradas (0013) |
| 12 | Detalle: 14 campos | ⚠️ | 13/14; "información del estudiante" muestra nombre+rol pero no matrícula/correo → D7 |
| 13 | Comentarios públicos vs notas internas (nunca al estudiante) | ✅ | RLS + UI pestañas; verificado (alumno ve 2 de 3) |
| 14 | Imágenes y PDF visibles dentro de la plataforma | ⚠️ | Imágenes ✅ lightbox; PDF abre en pestaña (doc dice "cuando sea técnicamente posible") → D12 aceptable |
| 14 | Acceso a documentos protegido | ✅ | Bucket privado + URLs firmadas 1 h + política dueño-o-staff |
| 15 | Máquina de estados + retorno Esperando→En proceso al responder | ✅ | En la DB; verificado |
| 16 | Resuelto exige resumen · luego Cerrado · conservación | ✅ | En la DB; botón literal "Resolver ticket (requiere resumen)" |
| 17 | SLA con semáforo dentro/por vencer/vencido; tiempos por definir | ✅ | Definidos: 4/8/24/72 h; semáforo en tabla y detalle |
| 18 | Bitácora de 10 eventos con autor y fecha | ✅ | Triggers; único hueco: cambio de área (→D6) |
| 19 | Seguridad (9 mecanismos; validación en servidor) | ✅ | Auditoría de seguridad ejecutada y corregida (commit `5a422c8`) |
| 20 | Seis interfaces | ⚠️ | 3/6 completas (dashboard, detalle, Mis Tickets); logins dedicados ❌ (D2) y Lumix ❌ (F4) |
| 21-23 | Beneficios/alcance | ✅ | Las notificaciones, que §23 difería a futuro, ya están en esta versión (in-app) |

## 2. Cotejo visual: figuras vs. frontend implementado

### Figura 5 — "Mis Tickets" vs `v2/alumnos.html`

| Elemento del mockup | Implementado | Nota |
|---|---|---|
| Header con título/subtítulo, campana con badge, usuario, Cerrar sesión | ✅ | Sin avatar ni rol junto al nombre (cosmético) |
| Nav superior Inicio/Mis Tickets/Ayuda + **sidebar** (Mis Tickets, Nuevo Reporte, Ayuda, Mi Perfil) | 🔀 | Diseño de una sola vista con topbar; Ayuda/Mi Perfil no existen como pantallas |
| Mascota flotante "Hablar con Lumix" | ❌ | F4 |
| CTA "+ Reportar nuevo problema" (+"con Lumix") | ✅/❌ | Botón ✅; mención Lumix F4 |
| 3 tarjetas: activos / esperando respuesta ("Requiere tu información") / resueltos | ✅ | Textos casi idénticos; sin iconos circulares |
| Búsqueda "por folio o título" + Estado + Categoría + **Fecha** | ⚠️ | Fecha ❌ (D4) |
| Tarjeta de ticket: icono por categoría · folio · título · snippet · categoría · fecha · área · **última actualización** · badge · chip "⚠ Se requiere información adicional" · botón Responder/Ver detalle | ⚠️ | Todo ✅ excepto icono (cosmético) y última actualización ❌ (D5) |
| Drawer: seguimiento en 4 pasos con fecha por paso · historial de mensajes con avatares · composer con **📎 📷** | ⚠️ | Pasos ✅ (fecha solo en "registrado"); burbujas ✅ sin avatar; adjuntar en composer ❌ (D3) |

### Figura 6 — Dashboard vs `v2/admin.html`

| Elemento | Implementado | Nota |
|---|---|---|
| Sidebar Dashboard/Tickets/**Reportes/Catálogos/Usuarios/Configuración** | 🔀/❌ | Pantallas no especificadas en el texto del doc (ya señalado en el análisis del documento); fuera del alcance actual → D13 |
| 4 KPIs con **tendencia % "vs semana anterior"** | ⚠️ | 6 KPIs (superset) sin tendencias — requeriría histórico → D9/aceptar |
| Búsqueda "ticket, **matrícula** o alumno" | ⚠️ | D7 |
| Filtros + **rango de fechas** + botón "Aplicar filtros" | ⚠️/🔀 | Fechas ❌ (D4); filtrado en vivo en lugar de botón (mejor UX) |
| Tabla: **checkboxes** · folio · fecha+hora · alumno con **matrícula** · asunto · categoría · canal con icono · prioridad · estado · responsable · SLA con barra+tiempo · **botón Ver detalle** · **kebab ⋮** | ⚠️ | Columnas ✅ todas; checkboxes/bulk ❌ (D14, aceptar); matrícula ❌ (D7); fila clickeable en vez de botón (D11); kebab ❌ (sin acciones rápidas) |
| "Mostrando 1 a 8 de 32" + paginación + **selector "8 por página"** | ⚠️ | Contador y páginas ✅; selector de tamaño ❌ (fijo 10, trivial) |

### Figura 7 — Detalle vs `v2/admin.html#ticket=N`

| Elemento | Implementado | Nota |
|---|---|---|
| **Búsqueda global en topbar** | ❌ | Solo en dashboard → D15 (menor) |
| "← Volver a tickets" · Ticket # + badge · título | ✅ | Literal |
| Meta: alumno con **matrícula** · categoría · creado · canal "Lumix (Chatbot)" | ⚠️ | Matrícula/correo ❌ (D7); canal ✅ |
| Descripción · Evidencias con miniaturas y lupa · **card de PDF con peso y fecha** | ⚠️ | Imágenes ✅ lightbox; PDF como enlace simple sin peso/fecha (cosmético) |
| "Historial y conversación" fusionados · **"Ver todo"** · timeline con "Por: X" · burbujas con avatar · NOTA INTERNA ámbar | ✅ | Concepto exacto; sin colapso "Ver todo" (mostramos todo) y sin avatares |
| Tabs "Respuesta pública / Nota interna" + composer + **📎 📷** | ⚠️ | Tabs ✅ literales; adjuntar ❌ (D3) |
| Gestión: **Estado como select** · Prioridad · Responsable | 🔀/✅ | Estado como botones de transición válida (espejo de la máquina de la DB) — deliberado y más seguro que un select libre |
| SLA: "02h 35min restantes" + barra + **58 %** + fecha límite | ✅ | Equivalente (sin el % numérico) |
| "Resolver Ticket — Requiere un resumen de la solución" · "Reasignar" | ✅ | Resolver literal; reasignar vía Responsable+Guardar |
| Nota "todos los cambios quedan en la bitácora" | ✅ | La bitácora es real (triggers) |

## 3. Lista consolidada de discrepancias

### Accionables (proponen trabajo)

| # | Discrepancia | Fuente | Esfuerzo | Propuesta |
|---|---|---|---|---|
| **D1** | Lumix móvil + QR + mascota/branding | §5, §20.5, figs 1-5 | F4 (ya planeada) | Ejecutar F4 |
| **D2** | Logins dedicados `/admin/login` y `/alumnos/login` (hoy ambos usan el login v1 del Campus) | §8, §20.1/.4, fig 3 | 0.5-1 día | Pantalla de acceso propia en cada página v2 (mismo Auth); **decisión: ¿o se acepta el login compartido?** |
| **D3** | Adjuntar evidencias desde la V2: formulario del portal y composers de respuesta (alumno y staff 📎📷) | §3, §5.4, §6, figs 5/7 | 0.5-1 día | Subida al bucket desde `shared.js` + adjunto ligado a ticket (la política RLS ya lo permite) |
| **D4** | Filtro por rango de fechas (dashboard y Mis Tickets) | §9, figs 5-6 | 2-3 h | Dos date-inputs sobre `fecha_creacion` (client-side) |
| **D5** | "Última actualización" por ticket | §6, fig 5 | 3-4 h | Columna `actualizado_en` mantenida por los triggers existentes (migración pequeña) + mostrar en tarjeta/tabla |
| **D6** | Cambiar el ÁREA desde gestión + auditar ese cambio (reasignación a otro departamento) | §7, §11 | 2-3 h | `/update` acepta `area_notificada_id` (el BEFORE ya valida) + caso en el trigger AFTER + select en el panel de gestión |
| **D7** | Matrícula/correo del estudiante en detalle y búsqueda | §9, §12, figs 6-7 | 2 h | Incluir `email` en el embed del reportador (la matrícula vive en el correo institucional) + mostrar + añadir al pajar de búsqueda |
| **D9** | KPI "En proceso" no visible (el dato ya existe en `v_kpi_resumen`) | §9 | 10 min | Séptima tarjeta o sustituir una |
| **D11** | Botón explícito "Ver detalle" en filas (hoy solo clic en fila; accesibilidad) | fig 6 | 30 min | Añadir botón, mantener el clic |

### Para decidir (no es evidente la respuesta correcta)

| # | Tema | Opciones |
|---|---|---|
| **D8** | Categorías: el doc V2 sugiere *Acceso y bloqueos, Plataforma virtual, Materias, Servicios escolares, Finanzas y pagos, Otros*; el catálogo real tiene *Finanzas, Sitio Web, Servo Web, Materias, Bloqueos/Acceso* | (a) renombrar/añadir para calcar el doc (+"Otros"), (b) mantener y documentar la equivalencia, (c) solo añadir "Otros". El lenguaje del doc es sugerente ("podrán contemplar") |
| **D2** | (ver arriba) login dedicado vs compartido | — |

### Proponemos aceptar (costo alto o valor bajo; documentar y ya)

| # | Elemento | Razón |
|---|---|---|
| D10 | Tendencias % "vs semana anterior" en KPIs | Requiere histórico de snapshots; sin datos aún no significa nada |
| D12 | Visor de PDF embebido | El doc lo condiciona ("cuando sea técnicamente posible"); la pestaña con URL firmada cumple |
| D13 | Sidebar + pantallas Reportes/Catálogos/Usuarios/Configuración | Sin especificación en el texto del doc (inconsistencia interna ya reportada en el análisis del documento) |
| D14 | Checkboxes de selección múltiple + kebab ⋮ (acciones bulk) | Sin acciones bulk definidas en el doc |
| D15 | Búsqueda global en el topbar del detalle · selector "N por página" · avatares/iconos de categoría · "Ver todo" colapsable · % numérico del SLA · fechas por paso del seguimiento | Cosméticos; candidatos a F5 si sobra tiempo |

### Divergencias deliberadas (decisiones del equipo, ya documentadas)

1. **Registro self-service deshabilitado** (§4.2) — seguridad F1; alta administrada.
2. **Identificación en Lumix por sesión**, no preguntando matrícula por chat (§5.2) — más seguro.
3. **Estado como botones de transición válida**, no select libre (fig 7) — espejo de la máquina de estados de la DB.
4. **Filtros en vivo** sin botón "Aplicar" (fig 6).
5. **Topbar en vez de sidebar** (figs 5-6) — mientras no existan las pantallas extra.
6. **Notificaciones dentro del alcance actual** (supera al §23, que las difería).
7. Todo lo anterior bajo el **interruptor V2** — apagado, nada de esto toca la v1.

## 4. Lo implementado que el documento no pidió

Prioridad *percibida vs. oficial* visible en gestión · kill-switch `?v2=off` · bucket privado con URLs firmadas · CSP+SRI · suite de 106 verificaciones · vistas KPI con `security_invoker` · bitácora con autor real incluso en transiciones automáticas.

## 5. Resumen ejecutivo

- **Texto del documento**: 19 secciones ✅, 8 ⚠️, 2 ❌ (Lumix/QR y logins dedicados — una es la fase F4 ya planeada).
- **Figuras**: la estructura y los textos clave de las figs. 5-7 están calcados (chips, tabs, "Resolver Ticket (requiere resumen)", timeline fusionada, NOTA INTERNA ámbar, barra SLA); las diferencias reales son **D3-D7** más cosméticos.
- **Nada de lo faltante es estructural**: D3-D7+D9+D11 suman ~2 días de trabajo y no tocan el esquema salvo D5 (una columna) — encajan como preludio de F4/F5.
