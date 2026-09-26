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
