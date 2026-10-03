// Nucleo compartido de la v2: interruptor, sesion, API y utilidades.
// Cargar despues de supabase-js y ../config.js; la v1 no lo usa.
(function () {
    'use strict';

    // --- Interruptor -------------------------------------------------
    function v2On() {
        return window.luxV2Enabled ? window.luxV2Enabled() : false;
    }

    // Corta la pagina si la V2 esta apagada. Primera llamada de toda pagina v2.
    function requireV2() {
        if (v2On()) return true;
        document.body.innerHTML =
            '<div class="v2-off">' +
            '<h1>Esta versión está desactivada</h1>' +
            '<p>La nueva experiencia no está disponible por ahora.</p>' +
            '<p><a class="v2-btn" href="../index.html">Ir al Campus Lux</a></p>' +
            '</div>';
        return false;
    }

    // --- Cliente Supabase (instancia propia de la pagina) --------------
    var client = null;
    function sb() {
        if (!client) {
            client = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.key);
        }
        return client;
    }

    var projectRef = new URL(window.supabaseConfig.url).hostname.split('.')[0];

    // --- Utilidades ----------------------------------------------------
    // Escape anti-XSS: todo dato del servidor pasa por aqui antes de innerHTML.
    function esc(v) {
        return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    var STAFF_ROLES = ['Soporte', 'Administrativo', 'Administrador'];

    // --- Sesion --------------------------------------------------------
    async function getSession() {
        var r = await sb().auth.getSession();
        return r.data.session || null;
    }

    // Sesion + perfil extendido (usuario_id, rol, nombre). null si no hay sesion.
    async function getProfile() {
        var session = await getSession();
        if (!session) return null;
        var r = await sb().from('usuario')
            .select('usuario_id, nombre, apellido, tipo_usuario, email, matricula')
            .eq('auth_uid', session.user.id)
            .single();
        var p = r.data || { nombre: 'Usuario', apellido: '', tipo_usuario: 'Alumno' };
        p.session = session;
        p.esStaff = STAFF_ROLES.indexOf(p.tipo_usuario) !== -1;
        // Invitado: sesion anonima de Supabase Auth.
        p.esInvitado = !!(session.user && session.user.is_anonymous);
        p.nombreCompleto = (p.nombre + ' ' + (p.apellido || '')).trim();
        return p;
    }

    async function logout() {
        try { await sb().auth.signOut(); } catch (e) { /* sin red: da igual */ }
        // Al salir se regresa al acceso del portal.
        window.location.href = 'alumnos.html';
    }

    // --- API (Edge Functions) ------------------------------------------
    async function callFn(path, opts) {
        opts = opts || {};
        var session = await getSession();
        if (!session) throw new Error('Sesión no disponible');
        var headers = { 'Authorization': 'Bearer ' + session.access_token };
        if (opts.body) headers['Content-Type'] = 'application/json';
        var resp = await fetch('https://' + projectRef + '.supabase.co/functions/v1/' + path, {
            method: opts.method || 'GET',
            headers: headers,
            body: opts.body ? JSON.stringify(opts.body) : undefined
        });
        var data = await resp.json().catch(function () { return {}; });
        if (!resp.ok) throw new Error(data.error || ('HTTP ' + resp.status));
        return data;
    }

    // --- Catalogos (cache por pagina; claves = codigo) ------------------
    var catalogsCache = null;
    async function getCatalogs() {
        if (catalogsCache) return catalogsCache;
        catalogsCache = await callFn('catalog-service');
        return catalogsCache;
    }

    // Comprime imagenes antes de subirlas (fotos de celular pesan 3-8 MB y
    // truenan en redes moviles): redimensiona a 1600px y exporta JPEG.
    // PDFs, imagenes ya ligeras o navegadores sin soporte: archivo original.
    async function comprimirImagen(file) {
        if (!file.type || !file.type.startsWith('image/')) return file;
        if (file.size <= 600 * 1024) return file;
        try {
            var bmp = await createImageBitmap(file);
            var MAX = 1600;
            var escala = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
            var w = Math.max(1, Math.round(bmp.width * escala));
            var h = Math.max(1, Math.round(bmp.height * escala));
            var canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
            if (bmp.close) bmp.close();
            var blob = await new Promise(function (res) { canvas.toBlob(res, 'image/jpeg', 0.82); });
            if (!blob || blob.size >= file.size) return file;
            var nombre = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            return new File([blob], nombre, { type: 'image/jpeg' });
        } catch (e) { return file; }
    }

    window.LuxV2 = {
        v2On: v2On,
        requireV2: requireV2,
        sb: sb,
        esc: esc,
        STAFF_ROLES: STAFF_ROLES,
        getSession: getSession,
        getProfile: getProfile,
        logout: logout,
        callFn: callFn,
        getCatalogs: getCatalogs,
        comprimirImagen: comprimirImagen
    };
})();

// Helpers de UI compartidos por admin.html y alumnos.html.
(function () {
    'use strict';
    var esc = window.LuxV2.esc;

    var nombreDe = function (u) {
        return u ? ((u.nombre || '') + ' ' + (u.apellido || '')).trim() : '';
    };
    var fmtFecha = function (v) {
        return v ? new Date(v).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    };
    var fmtHora = function (v) {
        return v ? new Date(v).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
    };
    // "21/09 · 12:05" (folio/fecha apilados y horas de la conversacion)
    var fmtFechaCorta = function (v) {
        if (!v) return '—';
        var d = new Date(v);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }) + ' · ' + fmtHora(v);
    };
    // "Hace 1 h 35 min" / "Hace 3 días"
    var fmtRelativo = function (v) {
        if (!v) return '';
        var ms = Date.now() - new Date(v);
        if (ms < 0) ms = 0;
        var min = Math.floor(ms / 60000), h = Math.floor(min / 60), d = Math.floor(h / 24);
        if (d >= 1) return 'Hace ' + d + (d === 1 ? ' día' : ' días');
        if (h >= 1) return 'Hace ' + h + ' h ' + (min % 60) + ' min';
        return 'Hace ' + min + ' min';
    };
    // "Act. hoy 12:05" / "Act. 18/09/2026"
    var fmtAct = function (v) {
        if (!v) return '';
        var f = new Date(v), hoy = new Date();
        return f.toDateString() === hoy.toDateString()
            ? 'Act. hoy ' + fmtHora(v)
            : 'Act. ' + f.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    var fmtRestante = function (ms) {
        var abs = Math.abs(ms), h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000);
        var txt = h > 0 ? (h + ' h ' + m + ' min') : (m + ' min');
        return ms >= 0 ? txt + ' restantes' : 'Vencido hace ' + txt;
    };
    var badgeEstado = function (t) {
        var nombre = t.estado ? t.estado.nombre : 'Desconocido';
        var codigo = nombre.toLowerCase().replace(/\s+/g, '_');
        return '<span class="v2-badge st-' + esc(codigo) + '">' + esc(nombre) + '</span>';
    };
    var badgePrioridad = function (t) {
        var p = t.prioridad || {};
        return '<span class="v2-badge pr-' + esc(p.codigo || '') + '">' + esc(p.nombre || '-') + '</span>';
    };
    // Semaforo de SLA: ok / warn (<=25% restante) / danger (vencido); cerrado: "Cumplido" o "—".
    var slaDe = function (t) {
        if (t.estado_id === 4 || t.estado_id === 5) {
            if (t.eta_estimada && t.fecha_cierre && new Date(t.fecha_cierre) <= new Date(t.eta_estimada)) {
                return { done: true, html: '<div class="v2-sla"><span class="txt">Cumplido</span>' +
                    '<div class="barra"><div class="fill" style="width:0%"></div></div></div>' };
            }
            return { done: true, html: '<span class="v2-nota">—</span>' };
        }
        if (!t.eta_estimada) return { html: '<span class="v2-nota">—</span>' };
        var total = new Date(t.eta_estimada) - new Date(t.fecha_creacion);
        var rest = new Date(t.eta_estimada) - Date.now();
        var pct = total > 0 ? Math.max(0, Math.min(100, Math.round(100 * rest / total))) : 0;
        var nivel = rest < 0 ? 'danger' : (pct <= 25 ? 'warn' : '');
        return {
            nivel: nivel, pct: pct, rest: rest,
            html: '<div class="v2-sla ' + nivel + '"><span class="txt">' + esc(fmtRestante(rest)) + '</span>' +
                '<div class="barra"><div class="fill" style="width:' + pct + '%"></div></div></div>'
        };
    };

    var iniciales = function (nombre) {
        var partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
        if (partes.length === 0) return '?';
        return (partes[0][0] + (partes[1] ? partes[1][0] : '')).toUpperCase();
    };

    // ---- Iconos de trazo (v2/iconos.js). svgIcono('ui.campana') / svgIcono(pathD) ----
    var svgIcono = function (ref, clase) {
        var d = ref;
        if (window.LuxIconos && ref && ref.indexOf(' ') === -1 && ref.indexOf('.') !== -1) {
            var p = ref.split('.');
            d = (window.LuxIconos[p[0]] || {})[p[1]] || '';
        }
        return '<svg class="v2-ico' + (clase ? ' ' + esc(clase) : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + esc(d) + '"/></svg>';
    };
    // Resuelve el codigo de categoria a partir del nombre.
    var codigoCategoria = function (nombre) {
        var n = String(nombre || '').toLowerCase();
        if (n.indexOf('acceso') !== -1) return 'acceso';
        if (n.indexOf('plataforma') !== -1) return 'plataforma';
        if (n.indexOf('materia') !== -1) return 'materias';
        if (n.indexOf('escolar') !== -1) return 'servicios_escolares';
        if (n.indexOf('finanza') !== -1) return 'finanzas';
        return 'otros';
    };
    var iconoCategoria = function (nombreOCodigo, clase) {
        var cats = (window.LuxIconos || {}).categoria || {};
        var codigo = cats[nombreOCodigo] ? nombreOCodigo : codigoCategoria(nombreOCodigo);
        return svgIcono('categoria.' + codigo, clase);
    };
    // Canal de entrada: 'chatbot' -> Lumix, 'portal' -> Portal web
    var canalDe = function (canal) {
        return canal === 'portal'
            ? { nombre: 'Portal web', icono: svgIcono('canal.portal', 'chica') }
            : { nombre: 'Lumix', icono: svgIcono('canal.lumix', 'chica') };
    };
    var fmtBytes = function (b) {
        if (b === null || b === undefined || b === 0) return '';
        if (b < 1024) return b + ' B';
        if (b < 1048576) return Math.round(b / 1024) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    };

    window.LuxV2.ui = {
        nombreDe: nombreDe,
        iniciales: iniciales,
        svgIcono: svgIcono,
        iconoCategoria: iconoCategoria,
        codigoCategoria: codigoCategoria,
        canalDe: canalDe,
        fmtBytes: fmtBytes,
        fmtFecha: fmtFecha,
        fmtHora: fmtHora,
        fmtFechaCorta: fmtFechaCorta,
        fmtRelativo: fmtRelativo,
        fmtAct: fmtAct,
        fmtRestante: fmtRestante,
        badgeEstado: badgeEstado,
        badgePrioridad: badgePrioridad,
        slaDe: slaDe,
    };

    // Sube una evidencia al bucket privado y la liga al ticket (la RLS valida).
    window.LuxV2.subirEvidencia = async function (usuarioId, ticketId, file) {
        file = await window.LuxV2.comprimirImagen(file);
        var tipos = ['image/png', 'image/jpeg', 'application/pdf'];
        if (tipos.indexOf(file.type) === -1) throw new Error('Formato no permitido: usa PNG, JPG o PDF.');
        if (file.size > 5 * 1024 * 1024) throw new Error('El archivo excede 5 MB.');
        var r = await window.LuxV2.sb().auth.getSession();
        var session = r.data.session;
        if (!session) throw new Error('Sesión no disponible');
        // Leer a memoria antes de enviar: un archivo en la nube (Drive/OneDrive)
        // falla al leerse a mitad del fetch con un "Failed to fetch" criptico.
        var bytes;
        try { bytes = await file.arrayBuffer(); }
        catch (e) { throw new Error('No pude leer el archivo. Si está en la nube (Drive/OneDrive), descárgalo al dispositivo e inténtalo de nuevo.'); }
        var ruta = session.user.id + '/' + Date.now() + '_' + file.name.replace(/[^\w.-]/g, '');
        var up = await window.LuxV2.sb().storage.from('tickets').upload(ruta, new Blob([bytes], { type: file.type }), { contentType: file.type });
        if (up.error) throw up.error;
        var ins = await window.LuxV2.sb().from('adjunto').insert({
            ticket_id: ticketId,
            subido_por_id: usuarioId,
            nombre_archivo: file.name,
            ruta_archivo_url: ruta,
            mime_type: file.type,
            size_bytes: file.size,
        });
        if (ins.error) throw ins.error;
    };

    // Campana de notificaciones. opts: { bell, punto, panel, lista, btnLeidas, alAbrirTicket }. Devuelve { recargar }.
    window.LuxV2.montarNotificaciones = function (opts) {
        async function recargar() {
            try {
                var r = await window.LuxV2.sb().from('notificacion')
                    .select('notificacion_id, ticket_id, tipo, contenido, leida, creado_at')
                    .order('creado_at', { ascending: false }).limit(12);
                var notifs = r.data || [];
                var noLeidas = notifs.filter(function (n) { return !n.leida; }).length;
                opts.punto.hidden = noLeidas === 0;
                if (noLeidas > 0) opts.punto.textContent = noLeidas;
                opts.lista.innerHTML = notifs.length === 0
                    ? '<p class="v2-nota" style="padding:8px;">Sin notificaciones.</p>'
                    : notifs.map(function (n) {
                        return '<div class="item' + (n.leida ? '' : ' nueva') + '" data-ticket="' + esc(n.ticket_id == null ? '' : n.ticket_id) + '">'
                            + esc(n.contenido) + '<time>' + esc(fmtFecha(n.creado_at)) + '</time></div>';
                    }).join('');
            } catch (e) { console.warn('notificaciones:', e); }
        }
        opts.bell.addEventListener('click', function () { opts.panel.hidden = !opts.panel.hidden; });
        opts.btnLeidas.addEventListener('click', async function () {
            try {
                await window.LuxV2.sb().from('notificacion').update({ leida: true }).eq('leida', false);
                recargar();
            } catch (e) { console.warn(e); }
        });
        opts.lista.addEventListener('click', function (ev) {
            var item = ev.target.closest('.item');
            if (item && item.dataset.ticket && opts.alAbrirTicket) {
                opts.panel.hidden = true;
                opts.alAbrirTicket(item.dataset.ticket);
            }
        });
        return { recargar: recargar };
    };

    // Realtime: refresco en vivo. Devuelve el canal (o null si falla).
    window.LuxV2.montarRealtime = function (tablas, alCambiar) {
        try {
            var ch = window.LuxV2.sb().channel('lux-cambios');
            tablas.forEach(function (t) {
                ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, function (payload) {
                    console.debug('realtime:', t, payload.eventType);
                    alCambiar(t, payload);
                });
            });
            ch.subscribe(function (status) { console.debug('realtime estado:', status); });
            return ch;
        } catch (e) { console.warn('realtime no disponible:', e); return null; }
    };
})();
