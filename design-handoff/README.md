# Design handoff: Sistema de Incidencias Universidad Lux (v2)

Diseño de las 6 interfaces de la sección 20 del documento del proyecto, hecho en Claude Design a partir de las figuras 3 a 7 y alineado con lo que ya existe en `v2/` y en `supabase/migrations/`. Esta carpeta es la referencia para reestilizar las páginas v2; no es código de producción.

## Contenido

- `capturas/`: PNG de cada pantalla y de sus estados clave. Es la referencia visual principal.
- `screens/`: las 6 pantallas en HTML estático (ábrelas en el navegador). Sirven para medir espaciados, tamaños y copiar SVG; los datos son de ejemplo.
- `specs.md`: comportamiento, reglas y decisiones por pantalla.
- `tokens.css`: valores del diseño aplicados sobre los mismos nombres que ya usa `v2/shared.css` (`--v2-*`, `.v2-badge.st-*`, `.v2-badge.pr-*`, `.v2-sla`).
- `iconos.js`: trazos SVG de los iconos (sustituyen los emoji de `iconoCategoria()` en `shared.js`).
- `assets/`: logo oficial en color y en blanco, mascota Lumix y su avatar, y el QR que ya estaba en `v2/assets/`.

## Qué pantalla corresponde a qué archivo

| Pantalla (ruta del doc) | Archivo del proyecto | Capturas |
|---|---|---|
| Acceso del estudiante `/alumnos/login` | `v2/alumnos.html` (vista de acceso) | `01-alumnos-login.png`, `01b-alumnos-registro.png` |
| Asistente Lumix `/chat/lumix` | `v2/lumix.html` | `02-*.png` |
| Mis Tickets `/alumnos/mis-tickets` | `v2/alumnos.html` | `03-*.png` |
| Login administrativo `/admin/login` | `v2/admin.html` (vista de acceso) | `04-*.png` |
| Dashboard `/admin/dashboard` | `v2/admin.html` | `05-*.png` |
| Detalle `/admin/tickets/[id]` | `v2/admin.html#ticket=ID` | `06-*.png` |

## Cómo usarlo con Claude Code

1. Abre una terminal en `LuxFBD/` y ejecuta `claude`.
2. Pega este prompt:

```
Lee design-handoff/README.md y design-handoff/specs.md. Vamos a reestilizar la v2
para que coincida con el diseño de design-handoff/capturas/ y design-handoff/screens/.

Orden: 1) integra design-handoff/tokens.css en v2/shared.css y copia
design-handoff/assets/ a v2/assets/; 2) v2/admin.html (dashboard y detalle);
3) v2/alumnos.html (acceso y Mis Tickets); 4) v2/lumix.html.

Reglas:
- No toques index.html ni nada de la v1. El interruptor v2 debe seguir funcionando.
- No modifiques supabase/migrations salvo que te lo pida; si una pantalla necesita
  un dato que el backend no da, detente y dímelo.
- Conserva la lógica, llamadas a la API, esc() y las clases existentes de shared.js;
  cambia estructura HTML y estilos, no el flujo de datos.
- Respeta la CSP de cada página (fuentes solo de fonts.googleapis.com / gstatic).
- Los textos y datos de screens/ son de ejemplo; usa los datos reales.
- Las decisiones marcadas como "Pendiente" en specs.md no las resuelvas tú: pregúntame.

Trabaja una página a la vez. Al terminar cada una, levanta el servidor
(npm run dev), compárala contra su captura y dime qué quedó distinto.
```

3. Revisa cada página contra su captura antes de pasar a la siguiente.

## Origen

Lienzo "Sistema de Incidencias Universidad Lux" en Claude Design, 26/09/2026. Los cambios de diseño se hacen ahí y se vuelve a exportar esta carpeta.
