window.supabaseConfig = {
    url: 'https://aftrxnerszxjfjxegjuk.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdHJ4bmVyc3p4amZqeGVnanVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzODQyNDgsImV4cCI6MjEwNTk2MDI0OH0.8u7DJqvblTLRr2AdRtY3WNLVo0MaUzWV6hKmB8L0xCk'
};

// Interruptor maestro de la V2.
// Cascada: ?v2=on|off (URL) > preferencia local > flag remoto (app_flag) > este default.
window.appConfig = { v2: false };

// Setter del switch del header (capa: preferencia del usuario)
window.luxV2Set = function (on) {
    try { localStorage.setItem('lux.v2.override', on ? 'on' : 'off'); } catch (e) { }
};

window.luxV2Enabled = function () {
    try {
        var p = new URL(window.location.href).searchParams.get('v2');
        if (p === 'on' || p === '1') { localStorage.setItem('lux.v2.override', 'on'); return true; }
        if (p === 'off' || p === '0') { localStorage.setItem('lux.v2.override', 'off'); return false; }
        var o = localStorage.getItem('lux.v2.override');
        if (o === 'on') return true;
        if (o === 'off') return false;
        var r = localStorage.getItem('lux.v2.remote');
        if (r === 'on') return true;
        if (r === 'off') return false;
    } catch (e) { /* almacenamiento bloqueado: usar el default */ }
    return !!(window.appConfig && window.appConfig.v2);
};

// Capa remota: consulta app_flag y guarda el resultado para la siguiente carga.
(function () {
    try {
        fetch(window.supabaseConfig.url + '/rest/v1/app_flag?clave=eq.v2&select=valor', {
            headers: {
                apikey: window.supabaseConfig.key,
                Authorization: 'Bearer ' + window.supabaseConfig.key
            }
        }).then(function (r) { return r.json(); }).then(function (d) {
            if (Array.isArray(d) && d.length > 0) {
                localStorage.setItem('lux.v2.remote', d[0].valor ? 'on' : 'off');
            }
        }).catch(function () { });
    } catch (e) { }
})();
