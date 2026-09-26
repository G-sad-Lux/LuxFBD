# Plan vivo — LuxFBD

> **Este archivo es la fuente de verdad de los accionables.** Regla de trabajo del equipo (acordada 2026-09-26):
> toda tarea entra aquí como un ítem con criterio de terminado; los ítems **se pueden quitar, modificar o agregar** en cualquier momento — pero el trabajo siempre sale de este plan, nunca de memoria.
> Al terminar un ítem: marcarlo `[x]`, anotar el commit, y moverlo a "Hecho" cuando la sección crezca.
> Contexto de fondo: [PLAN_V2.md](PLAN_V2.md) (arquitectura conmutable) · [AUDITORIA_V2.md](AUDITORIA_V2.md) (origen de los D-items) · [FLUJOS_Y_GAPS.md](FLUJOS_Y_GAPS.md).

---

## 🔴 Decisiones abiertas (bloquean ítems marcados con su ID)

*— ninguna por ahora — (D8 y D2 resueltas el 2026-09-26, ver Hecho)*

## 🟡 Pendientes del equipo (nadie más puede hacerlos)

- [ ] **Prueba de humo con sesión de soporte**: entrar como `lux.soporte@universidadlux.edu.mx` (v1 o `v2/admin.html?v2=on`) y avisar a Claude → valida panel v1 + dashboard F3 completo + ciclo asignar→responder→nota interna→resolver→cerrar + recálculo de prioridad del ticket #1.
- [ ] **Secrets del respaldo** en GitHub (Settings → Secrets → Actions): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `BACKUP_PASSPHRASE` → correr una vez el workflow "Backup y keep-alive" a mano y confirmar verde. *Sin esto, los datos siguen sin respaldo y el keep-alive no corre.*
- [ ] **Transferir el proyecto Supabase a una Organización del equipo** (hoy vive en cuenta personal): crear Org, invitar a los 4, Settings → General → Transfer project.
- [ ] Guardar las credenciales de prueba en la nota privada del equipo (no en el repo ni en documentos entregables).
- [ ] Integrar **docs/ANEXO_TECNICO.md** al .docx entregable del equipo (reemplaza el script T-SQL y el diagrama anterior).

## 🟢 Backlog accionable

### Paquete conformidad V2 (D-items de la auditoría) — ✅ COMPLETADO

- [x] **D3 — Adjuntar evidencias desde la V2** (formulario del portal + composer del alumno + composer de staff 📎): subida al bucket vía `shared.js` + fila en `adjunto`. La RLS ya lo permite. *Hecho cuando: un archivo subido desde el portal aparece firmado en el detalle admin.* (0.5-1 d)
- [x] **D5 — "Última actualización" por ticket**: migración `actualizado_en` mantenida por los triggers existentes + mostrarla en tarjetas (fig. 5) y tabla admin. (3-4 h)
- [x] **D6 — Cambio de ÁREA en gestión** + auditoría: `/update` acepta `area_notificada_id`, caso nuevo en el trigger AFTER, select en el panel de gestión. (2-3 h)
- [x] **D7 — Correo/matrícula del estudiante**: `email` en el embed del reportador, visible en detalle (figs. 6-7) y buscable en el dashboard. (2 h)
- [x] **D4 — Filtro por rango de fechas** en dashboard y Mis Tickets. (2-3 h)
- [x] **D9 — Tarjeta KPI "En proceso"** (el dato ya está en `v_kpi_resumen`). (10 min)
- [x] **D11 — Botón "Ver detalle" explícito** en las filas del dashboard (accesibilidad; hoy solo clic en fila). (30 min)

### F4 — Lumix móvil + QR

- [x] `v2/lumix.html` real: asistente conversacional completo (título→categoría→detalles→área→evidencia), sin pregunta de prioridad, canal `chatbot`, adjuntar con validación 5MB/tipos, consultar estado, chips que se apagan al usarse. E2E verificado (ticket #3 con ETA). *Pendiente menor: probar la subida de archivo con un archivo real (requiere diálogo del sistema).*
- [x] Botón/mascota "Hablar con Lumix" + CTA del panel → Lumix (fig. 5); `?volver=lumix` en el login único.
- [x] **QR en el login del Campus** (SVG build-time en v2/assets/qr-lumix.svg, visible con el interruptor ON) apuntando a `https://g-sad-lux.github.io/LuxFBD/v2/lumix.html` (generado build-time, sin servicios externos por CSP). (2-3 h)

### F5 — Pulido y cierre (≈1 día)

- [x] Branding v1: título "Sitio Sencillo y Responsivo" y footer "Lux Studio" → "Universidad Lux — Soporte".
- [x] Interruptor completo: **switch visible en el header v1** (con redirección por rol) + botón "↩ Clásica" en las páginas V2 + **flag remoto `app_flag` en DB** (cascada: URL > switch del usuario > DB > config.js).
- [x] Cosméticos: iconos de categoría, avatares de iniciales en burbujas, selector "N por página", % numérico en el SLA, fechas por hito en el seguimiento, card de archivo con peso/fecha.
- [ ] **Encender la V2 por default** (`config.js v2: true`) cuando F4 esté validada — decisión de equipo antes de la demo.

### 🎨 Fase de diseño High Fidelity — ✅ EJECUTADA (2026-09-26)

- [x] Restyle completo F-D0→F-D4 según **docs/PLAN_DISENO.md** + `design-handoff/` (1ª exportación): F-D0 tokens/assets/iconos de trazo/Plus Jakarta Sans + migración 0018 `resueltos_semana` (B2, PGlite verde y aplicada al proyecto); F-D1 admin (acceso embebido 04 con banner genérico, dashboard 05 con 6 KPI/vistas rápidas/exportar CSV/tabla apilada/Clasificar, detalle 06 con pestañas Conversación-Bitácora, nota interna, checkbox "Solicitar información→Esperando", modal Resolver y gestión auto-aplicada); F-D2 alumnos (acceso 01 con QR+mascota y pestaña única por D2, Mis Tickets 03 con panel lateral de 380px, línea de tiempo de 5 estados, CSAT y respuesta por estado); F-D3 Lumix (restyle 02 completo + paso de resumen + consultar con "qué falta" + acceso embebido para el flujo QR); F-D4 QA contra capturas + regresión interruptor/v1. Commits `573388c` → `7ca5360` → `2bdf917` → `36afc37` → cierre.

### 🎨 Diseño, 2ª iteración del handoff (re-export 2026-09-26, llegó DURANTE la implementación)

*El equipo re-exportó `design-handoff/` con pantallas nuevas mientras se ejecutaba la fase anterior; nada de esto estaba en PLAN_DISENO.md. Queda como backlog:*

- [ ] **Lumix embebido en Mis Tickets (PC)** (captura 03d, specs §3.3): control segmentado de 60px "Ticket #ID / Hablar con Lumix" en el panel derecho; "Reportar nuevo problema", "Nuevo reporte", la tarjeta de la barra lateral y el enlace de cerrados abren esa pestaña en vez de navegar; al crear, el ticket aparece en la lista sin recargar; botón de éxito "Ver en mi lista". (~1 d)
- [ ] **Portal móvil <600 px** (capturas 08-10, specs §3.8): acceso con cabecera azul marino y botón "Reportar con Lumix"; Mis Tickets con chips de filtro con contador, Esperando primero con franja "{Encargado} espera tu comprobante" y barra inferior de 76px con Lumix central; detalle móvil propio con barra de avance de 5 segmentos, aviso naranja fijo y vista previa del adjunto. Hoy la página ya es responsiva pero con el patrón cajón lateral. (~1-1.5 d)
- [ ] 🔴 **D5 del handoff — demo QR por matrícula SIN contraseña** (02a/02b, §3.7): **no se implementó a propósito**: la propia spec la marca *Pendiente* (permite reportar a nombre de otro alumno) y contradice la decisión de seguridad vigente "identificación por sesión, nunca matrícula por chat". Decidir en equipo cómo (candidatas: Edge Function que valida matrícula y crea con service role solo con flag de demo encendido; o el anonymous sign-in 72h ya registrado). Mientras tanto el QR abre Lumix con **login embebido en la misma pantalla** (ya funciona).
- [ ] Spec §3.7 pide `canal_entrada = 'lumix'`: hoy el CHECK sólo admite `portal|chatbot` y la UI ya muestra "Lumix"; decidir si amerita migración de rename o se queda `chatbot`.

### Opcionales con valor de concurso (del análisis de flujos, P3)

- [x] Encuesta CSAT (1-5): rpc `calificar_ticket` (solo reportador, solo resuelto, una vez, en bitácora) + estrellas en Mis Tickets + KPI en Reportes.
- [x] Pantalla de reportes en admin (#reportes): tickets por categoría, tiempos por prioridad y cumplimiento de SLA sobre las vistas SQL.
- [x] Supabase Realtime: ticket/comentario/notificacion publicados; dashboard, panel y campana se refrescan solos (RLS filtra los eventos).
- [ ] **Análisis técnico**: sesión temporal de 72 h vía QR para usuarios no dados de alta (idea del equipo en D2 de diseño; candidata: anonymous sign-in de Supabase con expiración y alcance mínimo).
- [ ] Correo real en eventos clave — **requiere cuenta Resend del equipo** (API key como secret de función); las notificaciones in-app ya están validadas.
- [x] Material del documento entregable listo: **docs/ANEXO_TECNICO.md** (E-R en Mermaid sin auto-traducción, las 17 migraciones como script oficial, reglas de negocio, seguridad, endpoints, SLA, operación — sin credenciales).

## ⚪ Aceptados (no se trabajan; auditoría §3)

Tendencias % en KPIs · visor PDF embebido · sidebar con Reportes/Catálogos/Usuarios/Configuración · checkboxes/acciones bulk · búsqueda global en detalle.

---

## ✅ Hecho (compactado, con commits)

| Qué | Commits clave |
|---|---|
| Reactivación completa del backend perdido: 7 migraciones (esquema, seed IDs exactos, RLS, trigger auth, storage), funciones desplegadas, `config.js` nuevo, suite PGlite | `752f0a3` |
| Auditoría de seguridad: 7 hallazgos corregidos (escalada por metadata, 5×XSS, fuga de errores) + bucket privado con URLs firmadas + CORS allowlist + CSP/SRI + signup deshabilitado | `5a422c8` |
| P0 anti-demo: sesión persistente, logout, router con guard, consultar estado en chat, workflow backup+keep-alive | `efd0692` |
| Fix B8 (mapas por `codigo`) · promoción soporte vía migración | `fc3c143`, `71f74cd` |
| F0 interruptor V2 (URL>localStorage>config) + esqueleto `v2/` + `shared.js` | `370fe65` |
| F1 backend compartido: 4 prioridades unificadas, ETA/SLA con recálculo, máquina de estados (incl. retorno automático 3→2), resumen obligatorio, bitácora y notificaciones por triggers, comentarios int/ext con RLS, vistas KPI `security_invoker`, `/comments`, service role eliminado — suite 106/106 | `a2f808d` |
| F3 dashboard admin (figs. 6-7) · F2 Mis Tickets verificado en vivo (ticket #2 por portal, ETA exacta, campana, comentario) | `97920fa`, `df70646` |
| Auditoría de conformidad V2 · fix orden de catálogos | `ad44d34`, `0eb33bd` |
| **CSAT + Realtime + cosméticos F5 + Anexo técnico** (migración 0017, suite 131/131): calificación con estrellas y KPI, refresco en vivo por Realtime con RLS, avatares/iconos/fechas-por-paso/card-archivo/%SLA/tamaño-página, y docs/ANEXO_TECNICO.md listo para el .docx. Correo queda pendiente de cuenta Resend | (resto) |
| **Interruptor desde el frontend** (mandato 2026-09-26): switch en el header v1 + Clásica en V2 + capa remota app_flag (migración 0016, suite 120/120) · **pantalla 📊 Reportes** en admin sobre las vistas KPI. Ciclo verificado en vivo: Clásica→v1(OFF)→switch→v2 por rol; capa remota cacheada | (interruptor) |
| **Paquete conformidad + cierre F4/F5-parcial**: D3 evidencias desde composers (alumno y staff) y Lumix · D4 filtros de fecha · D5 actualizado_en con backfill y bumps por triggers · D6 área editable en gestión con bitácora · D7 correo del reportador en detalle y búsqueda · D9 KPI En proceso · D11 botón Ver detalle · QR de Lumix en el login · branding v1 (migración 0015, suite 117/117) | (paquete) |
| **Decisión de producto**: el reporte de tickets es SIEMPRE en formato chatbot (asistente virtual) — se eliminó el formulario clásico del portal; Lumix es el único flujo de captura en V2 (Lux-IA en v1). Lumix real construido y verificado E2E | (mismo commit que D8/D2 +1) |
| **D8 resuelta**: catálogo con las 6 categorías del doc V2 (Acceso y bloqueos, Plataforma virtual, Materias, Servicios escolares, Finanzas y pagos, Otros; IDs conservados, chat v1 actualizado, fallback → Otros) · **D2 resuelta**: login único que detecta el rol; con `?volver=v2` regresa a admin/alumnos según el tipo de usuario | (este commit) |
