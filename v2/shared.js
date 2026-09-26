// ============================================================
// LuxFBD v2 - nucleo compartido: interruptor, sesion, API, utilidades.
// Cargar en este orden: supabase-js (CDN) -> ../config.js -> este archivo.
// index.html (v1) NUNCA carga este archivo: la v1 no depende de v2/.
// ============================================================
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
            .select('usuario_id, nombre, apellido, tipo_usuario, email')
            .eq('auth_uid', session.user.id)
            .single();
        var p = r.data || { nombre: 'Usuario', apellido: '', tipo_usuario: 'Alumno' };
        p.session = session;
        p.esStaff = STAFF_ROLES.indexOf(p.tipo_usuario) !== -1;
        p.nombreCompleto = (p.nombre + ' ' + (p.apellido || '')).trim();
        return p;
    }

    async function logout() {
        try { await sb().auth.signOut(); } catch (e) { /* sin red: da igual */ }
        window.location.href = '../index.html';
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
        getCatalogs: getCatalogs
    };
})();

// ============================================================
// Helpers de UI compartidos por admin.html y alumnos.html (F2/F3)
// ============================================================
(function () {
    'use strict';
    var esc = window.LuxV2.esc;

    var nombreDe = function (u) {
        return u ? ((u.nombre || '') + ' ' + (u.apellido || '')).trim() : '';
    };
    var fmtFecha = function (v) {
        return v ? new Date(v).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
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
    // Semaforo de SLA: ok / warn (<=25% del tiempo) / danger (vencido).
    var slaDe = function (t) {
        if (!t.eta_estimada || t.estado_id === 4 || t.estado_id === 5) return { html: '<span class="v2-nota">—</span>' };
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

    window.LuxV2.ui = {
        nombreDe: nombreDe,
        fmtFecha: fmtFecha,
        fmtRestante: fmtRestante,
        badgeEstado: badgeEstado,
        badgePrioridad: badgePrioridad,
        slaDe: slaDe,
    };

    // Campana de notificaciones (tabla notificacion bajo RLS de destinatario).
    // opts: { bell, punto, panel, lista, btnLeidas, alAbrirTicket(ticketId) }
    // Devuelve { recargar }.
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
})();
