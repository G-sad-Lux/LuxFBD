# Plan de reactivación — revivir LuxFBD v1

**Fecha:** 25 de septiembre de 2026
**Objetivo:** que la versión 1 (la que está publicada en GitHub Pages) vuelva a funcionar de punta a punta: login → chat Lux-IA → crear ticket con evidencia → panel de soporte → detalle → reasignar → historial.
**Método:** inventario exhaustivo de cada punto donde el código toca el backend muerto, verificado línea por línea contra `index.html` y las Edge Functions.

---

## 1. Estado verificado hoy

| Pieza | Estado | Verificación |
|---|---|---|
| Repositorio GitHub | ✅ **Sí está en GitHub**: `G-sad-Lux/LuxFBD`, rama `master` | `git remote -v`, `git fetch` |
| Sincronía local ↔ remoto | ✅ Idénticos (0 commits de diferencia, árbol limpio) | `git rev-list --count` |
| GitHub Pages | ✅ Vivo y sirviendo el mismo commit (`a6ab069`); último deploy 6-dic-2025 | `curl` al sitio; `index.html` publicado = local (solo difieren fines de línea CRLF/LF) |
| `config.js` publicado | ⚠️ Apunta al proyecto muerto `nsrduorngzyoiwpbkgku` | `curl config.js` |
| Proyecto Supabase | 💀 **No existe** — el dominio ni siquiera resuelve (NXDOMAIN) | `nslookup` |
| Edge Functions desplegadas | 💀 Perdidas; el **código fuente sí está** en el repo (`supabase/functions/`) | repo |
| `supabase/config.toml`, `supabase/migrations/` | ❌ Nunca existieron | repo |
| Carpeta `docs/` (análisis) | ⚠️ Solo local, **sin commitear** | `git status` |
| Herramientas locales | Solo Node/npm. Sin Supabase CLI, sin Docker (no se necesita), sin `gh` | verificado |

**Conclusión:** todo el *código* está a salvo en GitHub. Lo que murió es 100 % *estado del backend*: base de datos, usuarios, archivos y despliegue de funciones. Revivir = recrear ese estado en un proyecto nuevo + 2 ediciones mínimas de código.

---

## 2. El contrato exacto que el código exige de la base de datos

Esto es lo que la DB nueva **debe** tener para que el código actual funcione **sin modificarlo**. Cada fila cita dónde lo exige el código.

### 2.1 Tablas y columnas

#### `usuario`
| Columna | Tipo | Exigida por |
|---|---|---|
| `usuario_id` | bigint PK identity | todas las funciones |
| `auth_uid` | uuid **UNIQUE**, ref. `auth.users.id` | login (`index.html:1336`), `/create`, `/list`, `/update` (`.eq('auth_uid', user.id)`) |
| `nombre`, `apellido` | varchar | login, `/staff`, `/update`, embeds |
| `tipo_usuario` | varchar | login (ruteo de vista), `/list` (filtro), `/update` (permiso), `/staff` |
| `email`, `telefono`, `activo`, `creado_at` | — | no las usa el código; recomendadas por el diseño |

**Valores de `tipo_usuario` que el código reconoce** (cualquier CHECK debe admitirlos): `Alumno`, `Maestro`, `Administrativo`, `Soporte`, `Administrador` (+ el literal `estudiante` como fallback interno del frontend, no de DB).

#### `catalogo`
| Columna | Exigida por |
|---|---|
| `catalogo_id` PK | FKs de ticket |
| `tipo` (`categoria` \| `prioridad` \| `estado` \| `area`) | `catalog-service` filtra por `tipo` |
| `nombre` | todos los embeds y `catalog-service` |
| `codigo` | **`catalog-service` la selecciona** (`index.ts:24-27`) y `/list`//`details` la piden en el embed de prioridad → **la columna debe existir** (puede ser NULL) |
| `orden`, `nivel` | no usadas; opcionales |

#### `ticket`
| Columna | Exigida por |
|---|---|
| `ticket_id` PK | todo |
| `titulo`, `detalles` | `/create` inserta; UI muestra |
| `fecha_creacion` default `now()` | `/list` ordena por ella |
| `fecha_cierre` NULL | diseño (el código no la toca) |
| `reportador_id` → `usuario` | `/create`, filtro de `/list`, embed `reportador` |
| `categoria_id` → `catalogo` | `/create`, embed `catalogo:categoria_id(nombre)` |
| `prioridad_id` → `catalogo` | `/create`, embed `prioridad:...(nombre, codigo)` |
| `estado_id` → `catalogo` | `/create` (fijo = 1), embed `estado` |
| `area_notificada_id` → `catalogo` | `/create` (fijo = 38), embed `area` |
| `maestro_notificado_id` → `usuario`, NULL | `/update` la escribe, embed `asignado` |

> ⚠️ **Las 6 claves foráneas son obligatorias como CONSTRAINT reales**, no solo columnas: los selects usan *embeds* de PostgREST (`prioridad:prioridad_id(nombre)`, `asignado:maestro_notificado_id(...)` — `ticket-manager:147-155, 178-186`) que **solo funcionan si la FK existe** en el esquema. Sin las FKs, `/list` y `/details` truenan aunque los datos estén bien.

#### `adjunto`
| Columna | Exigida por |
|---|---|
| `adjunto_id` PK | — |
| `ticket_id` → ticket | `/create` inserta, `/details` filtra |
| `subido_por_id` → usuario | `/create` inserta |
| `nombre_archivo`, `ruta_archivo_url` | `/create` inserta; UI renderiza |
| `mime_type` | `/create` inserta; **UI decide imagen vs. link** (`index.html:1841`) |
| `size_bytes` | `/create` inserta |
| `bucket_id` (text, default `'tickets'`) | `/create` inserta el literal `'tickets'` |
| `fecha_subida` | `/create` inserta ISO string |

#### `historial`
| Columna | Exigida por |
|---|---|
| `historial_id` PK | — |
| `ticket_id` → ticket | insert y filtro (`/update`, `/details`) |
| `autor_id` → usuario (**FK real**, por el embed `autor:autor_id(nombre, apellido)`) | `/details:202` |
| `campo_modificado` | **`/update:293` la inserta** — si no existe, el insert falla en silencio |
| `valor_anterior`, `valor_nuevo` | `/update` inserta |
| `cambio` | `/update` inserta **texto libre** (`"[X] Reasignó la tarea a [Y]"`) → **sin CHECK restrictivo** (el CHECK del documento v1 `IN ('estado','prioridad',...)` rompería el insert) |
| `fecha_cambio` default `now()` | `/details` ordena por ella |

Tablas del diseño **no requeridas para revivir** (el código no las toca): `comentario`, `asignacion`, `notificacion`, `prioridad_sla`. Se crean igual en la migración (cuestan cero y las necesita la fase 2), pero no bloquean nada.

### 2.2 Datos semilla con IDs EXACTOS (crítico)

El frontend usa mapas estáticos porque `loadCatalogs()` corre antes del login y siempre cae al fallback (`index.html:1235-1277`, `1383-1390`). Por lo tanto **los IDs del catálogo no son negociables**: hay que sembrarlos con esos números explícitos.

| ID | tipo | nombre | Exigido por |
|---|---|---|---|
| **1** | estado | Abierto | `/create` fija `estado_id: 1` (`ticket-manager:93`) |
| 2–5 | estado | En proceso, Esperando respuesta, Resuelto, Cerrado | solo display (IDs libres; usamos 2-5) |
| **6** | prioridad | Crítico | `STATIC_PRIORITY_MAP.alta = 6` |
| **7** | prioridad | Medio | `STATIC_PRIORITY_MAP.media = 7` |
| **8** | prioridad | Bajo | `STATIC_PRIORITY_MAP.baja = 8` y default del backend (`prioridad_id \|\| 8`) |
| **33** | categoria | Finanzas | `STATIC_CATEGORY_MAP` |
| **34** | categoria | Sitio Web | ídem |
| **35** | categoria | Servo Web | ídem |
| **36** | categoria | Materias | ídem |
| **37** | categoria | Bloqueos/Acceso | ídem + fallback del frontend (`categoria_id \|\| 37`) |
| **38** | area | Soporte Técnico | `DEFAULT_AREA_ID = 38` y **hardcode del backend** (`ticket-manager:94`) |
| 39 | area | Servicios Escolares | opción del chat (ID libre) |

Técnica: `catalogo_id` es `generated BY DEFAULT as identity` (admite IDs explícitos en el INSERT) y la semilla termina con `setval` a 100 para que los futuros registros no choquen. Implementado en `supabase/migrations/20260925000002_seed.sql`.

### 2.3 Row Level Security

Las funciones consultan con **el JWT del usuario** (rol `authenticated`), salvo dos operaciones de `historial` que usan service role (lectura en `/details:195-204`, escritura en `/update:265-297` — el service role **ignora RLS**, no requiere política).

Mínimo para que todo funcione, y de paso **cerrando los 3 agujeros de la API sin tocar código**:

| Tabla | SELECT | INSERT | UPDATE |
|---|---|---|---|
| `usuario` | fila propia **o** solicitante es staff (cubre login y `/staff`) | — (trigger) | — |
| `catalogo` | authenticated | — | — |
| `ticket` | `reportador_id = usuario_actual()` **o** staff | solo con `reportador_id = usuario_actual()` | solo staff |
| `adjunto` | dueño del ticket o staff | `subido_por_id = usuario_actual()` | — |
| `historial` | — (solo service role la lee) | — (solo service role escribe) | — |
| resto | ninguna (denegar por defecto) | | |

Bono verificado contra el código: con estas políticas, **los tres huecos de seguridad de la API quedan cerrados sin modificar las funciones** — `/details` deniega tickets ajenos (la función lee el ticket con el JWT del usuario **antes** de tocar el historial y truena ahí, `ticket-manager:176-190`), el filtro fail-open de `/list` queda neutralizado (RLS recorta lo que la query devuelva), y `/staff` devuelve vacío a los alumnos (el frontend ya tolera lista vacía).

Definición de "staff" para estas políticas (lo que el código acepta): `tipo_usuario IN ('Soporte','Administrativo','Administrador')` — Maestro queda como reportador (así lo pide el documento v1; el código igual le filtra /list a solo-propios). Se afina en fase 2 con la política de roles de la v2.

### 2.4 Sincronización Auth → `usuario`

El código busca el perfil por `auth_uid` en cuatro lugares y **truena si no existe** (`"User profile not found"`, `ticket-manager:79-81`). Se necesita un **trigger** `AFTER INSERT ON auth.users` que cree la fila en `public.usuario` (rol default `Alumno`, nombre/apellido desde `raw_user_meta_data`). Esto reemplaza al placeholder `user-admin/sync` y elimina el paso manual que antes hacían.

---

## 3. Auth: configuración y usuarios

| Qué | Valor | Por qué |
|---|---|---|
| Proveedor Email/Password | ON | único método que usa el frontend (`signInWithPassword`) |
| **Confirm email** | **OFF** | el frontend no tiene flujo de confirmación; esto reemplaza al parche `confirm_users.sql` (que se elimina del repo) |
| Registro público (signups) | Puede quedar ON u OFF — el frontend **no tiene** pantalla de registro; los usuarios se crean desde el dashboard | v1 no contempla registro |
| Usuarios de prueba | 1 `Alumno` + 1 `Soporte` (mínimo). Crear en Dashboard → Authentication → Add user (auto-confirm) | el trigger crea el perfil; un `UPDATE usuario SET tipo_usuario='Soporte'` para el segundo |

> `Soporte` es el rol de staff que satisface **todas** las listas del código a la vez (vista admin, `/update`, `/staff`): usarlo para las pruebas evita las inconsistencias `Administrador`/`Administrativo` sin tocar código.

## 4. Storage

| Qué | Valor | Exigido por |
|---|---|---|
| Bucket | `tickets` | upload y `getPublicUrl` (`index.html:1672-1680`), `adjunto.bucket_id` |
| Visibilidad | **Público** (para revivir tal cual) | la UI muestra evidencias vía `getPublicUrl`; hacerlo privado exige cambiar `/details` a URLs firmadas → fase 2 |
| Límites en el bucket | 5 MB, `image/png,image/jpeg,application/pdf` | endurece sin tocar código (el cliente ya restringe con `accept`) |
| Política INSERT | authenticated, `bucket_id='tickets'`, primer folder = `auth.uid()` | el cliente ya sube a `${userId}/...` (`index.html:1670`) |

## 5. Edge Functions

| Función | ¿Desplegar? | Config |
|---|---|---|
| `ticket-manager` | ✅ Sí | `verify_jwt` default (ON) — todas las llamadas del frontend mandan Bearer. Los secrets `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY` **se inyectan solos**, no hay que configurarlos |
| `catalog-service` | ✅ Sí, despliegue normal (verify_jwt ON); la llamada pre-login cae al fallback estático, igual que siempre | hoy se llama **antes** del login sin token → 401 → mapas estáticos. Con los IDs semilla de §2.2 el fallback es correcto, así que no bloquea |
| `user-admin` | ❌ No | código muerto (nadie la llama); su función la cubre el trigger de §2.4 |

## 6. Cambios de código (los únicos dos para revivir)

1. **`config.js`** → URL y anon key del proyecto nuevo (1 línea cada una). GitHub Pages se redepliega solo con el push.
2. **`index.html`** → el project ref muerto está **hardcodeado 6 veces** (líneas 1235, 1599, 1725, 1773, 1794, 1912: `const projectRef = 'nsrduorngzyoiwpbkgku'`). Arreglo mínimo y a prueba de futuro: definir una sola vez `const projectRef = new URL(window.supabaseConfig.url).hostname.split('.')[0];` junto a la inicialización y borrar las 6 copias locales. Así el próximo cambio de proyecto solo toca `config.js`.

**Nada más.** Todos los demás defectos conocidos (XSS, sesión, catálogos post-login, RF faltantes) no impiden revivir y quedan para la fase acordada de endurecimiento.

## 7. Herramientas que faltan en la máquina

| Herramienta | ¿Necesaria? | Cómo |
|---|---|---|
| Supabase CLI | ✅ | `npm i -D supabase` (queda versionada en `package.json`; sin instalación global) |
| Docker | ❌ No | `db push` y `functions deploy` van contra el proyecto remoto vía API |
| Access token de Supabase | ✅ (lo generan ustedes) | Dashboard → Account → Access Tokens; se usa con `npx supabase login` |
| `gh` CLI | ❌ No | `git push` normal basta |

---

## 8. Runbook: orden exacto de reactivación

**Fase 0 — Ustedes (≈15 min, en el dashboard de Supabase):**
1. Crear **Organización** del equipo e invitar a los 4 integrantes.
2. Crear proyecto (plan Free, región **East US – N. Virginia**). Guardar la **contraseña de la DB**.
3. Copiar y pasarme: **Project URL** + **anon key** (Settings → API). *Nunca la service_role.*
4. Generar un **access token** personal para el CLI.

**Fase 1 — Yo (el grueso del trabajo, no depende de la Fase 0):**
5. `supabase/migrations/0001_schema.sql` — 9 tablas (contrato §2.1 + las 4 de fase 2), FKs, índices.
6. `0002_seed.sql` — catálogo con IDs exactos (§2.2) + `setval`.
7. `0003_rls.sql` — políticas (§2.3) + funciones `usuario_actual()` / `es_staff()`.
8. `0004_auth_trigger.sql` — sincronización auth→usuario (§2.4).
9. `0005_storage.sql` — bucket `tickets` + políticas + límites (§4).
10. Ediciones de código de §6 + borrar `confirm_users.sql` y `supabase/functions/user-admin/`.

**Fase 2 — Despliegue (yo, con el token; ≈10 min):**
11. `npm i -D supabase` → `npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push`.
12. `npx supabase functions deploy ticket-manager` y `npx supabase functions deploy catalog-service`.
13. Commit + push → Pages redepliega con el `config.js` nuevo.

**Fase 3 — Ustedes (5 min):**
14. Crear en Authentication los 2 usuarios de prueba (auto-confirm) y correr en SQL Editor: `UPDATE usuario SET tipo_usuario='Soporte' WHERE ... ;` (les dejo el comando exacto).

**Fase 4 — Prueba de humo (juntos):**
- [ ] Login alumno → dashboard de cursos visible
- [ ] Chat: reportar problema completo con evidencia → "Ticket creado #N"
- [ ] Login soporte → panel con el ticket → detalle con evidencia visible
- [ ] Reasignar → alerta de éxito → historial muestra "[Soporte] Reasignó la tarea a [...]"
- [ ] Alumno: nav "Soporte LuxIA" → ve **solo** su ticket
- [ ] Alumno intentando `/details?id=` de un ticket ajeno → error (RLS)

**Definición de "revivido":** los 6 puntos de la prueba de humo en verde sobre la URL pública de GitHub Pages.

## 9. Después de revivir (ya acordado, no bloquea)

Endurecimiento (XSS/CSP/sesión/logout) → RF faltantes (comentarios, estado/prioridad/cierre, ETA, notificaciones, filtros) → decisiones de la v2 (Lumix, QR, 4 prioridades, portales separados). Además: workflow semanal de respaldo/keep-alive para que **no vuelva a pasar** (el plan Free pausa proyectos inactivos a los ~7 días).

> Pendiente menor: la carpeta `docs/` (este archivo y `ANALISIS_PROYECTO.md`) está solo en local; hay que commitearla para que el equipo la vea en GitHub.
