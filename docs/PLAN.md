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

## 🟢 Backlog accionable

### Paquete conformidad V2 (D-items de la auditoría, ~2 días)

- [ ] **D3 — Adjuntar evidencias desde la V2** (formulario del portal + composer del alumno + composer de staff 📎): subida al bucket vía `shared.js` + fila en `adjunto`. La RLS ya lo permite. *Hecho cuando: un archivo subido desde el portal aparece firmado en el detalle admin.* (0.5-1 d)
- [ ] **D5 — "Última actualización" por ticket**: migración `actualizado_en` mantenida por los triggers existentes + mostrarla en tarjetas (fig. 5) y tabla admin. (3-4 h)
- [ ] **D6 — Cambio de ÁREA en gestión** + auditoría: `/update` acepta `area_notificada_id`, caso nuevo en el trigger AFTER, select en el panel de gestión. (2-3 h)
- [ ] **D7 — Correo/matrícula del estudiante**: `email` en el embed del reportador, visible en detalle (figs. 6-7) y buscable en el dashboard. (2 h)
- [ ] **D4 — Filtro por rango de fechas** en dashboard y Mis Tickets. (2-3 h)
- [ ] **D9 — Tarjeta KPI "En proceso"** (el dato ya está en `v_kpi_resumen`). (10 min)
- [ ] **D11 — Botón "Ver detalle" explícito** en las filas del dashboard (accesibilidad; hoy solo clic en fila). (30 min)

### F4 — Lumix móvil + QR

- [x] `v2/lumix.html` real: asistente conversacional completo (título→categoría→detalles→área→evidencia), sin pregunta de prioridad, canal `chatbot`, adjuntar con validación 5MB/tipos, consultar estado, chips que se apagan al usarse. E2E verificado (ticket #3 con ETA). *Pendiente menor: probar la subida de archivo con un archivo real (requiere diálogo del sistema).*
- [x] Botón/mascota "Hablar con Lumix" + CTA del panel → Lumix (fig. 5); `?volver=lumix` en el login único.
- [ ] **QR en el login del Campus** apuntando a `https://g-sad-lux.github.io/LuxFBD/v2/lumix.html` (generado build-time, sin servicios externos por CSP). (2-3 h)

### F5 — Pulido y cierre (≈1 día)

- [ ] Branding v1: título "Sitio Sencillo y Responsivo" y footer "Lux Studio" → "Universidad Lux — Soporte".
- [ ] Flag `v2` en tabla `app_flag` (apagado remoto sin deploy) — opcional.
- [ ] Cosméticos si sobra tiempo: iconos de categoría en tarjetas, avatares en burbujas, "N por página", % numérico del SLA, fechas por paso del seguimiento, card de PDF con peso/fecha.
- [ ] **Encender la V2 por default** (`config.js v2: true`) cuando F4 esté validada — decisión de equipo antes de la demo.

### Opcionales con valor de concurso (del análisis de flujos, P3)

- [ ] Encuesta CSAT (1-5) al cerrar ticket + columna y KPI.
- [ ] Pantalla de reportes (las vistas `v_tickets_por_categoria` y `v_tiempo_resolucion` ya existen; solo falta UI).
- [ ] Supabase Realtime para refresco en vivo del dashboard.
- [ ] Correo real en eventos clave (Resend/SMTP) — después de validar in-app.
- [ ] Actualizar el **documento entregable** (script T-SQL→PostgreSQL real, diagrama E-R regenerado sin auto-traducción, endpoints reales, sin credenciales).

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
| **Decisión de producto**: el reporte de tickets es SIEMPRE en formato chatbot (asistente virtual) — se eliminó el formulario clásico del portal; Lumix es el único flujo de captura en V2 (Lux-IA en v1). Lumix real construido y verificado E2E | (mismo commit que D8/D2 +1) |
| **D8 resuelta**: catálogo con las 6 categorías del doc V2 (Acceso y bloqueos, Plataforma virtual, Materias, Servicios escolares, Finanzas y pagos, Otros; IDs conservados, chat v1 actualizado, fallback → Otros) · **D2 resuelta**: login único que detecta el rol; con `?volver=v2` regresa a admin/alumnos según el tipo de usuario | (este commit) |
