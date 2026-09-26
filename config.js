window.supabaseConfig = {
    url: 'https://aftrxnerszxjfjxegjuk.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdHJ4bmVyc3p4amZqeGVnanVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzODQyNDgsImV4cCI6MjEwNTk2MDI0OH0.8u7DJqvblTLRr2AdRtY3WNLVo0MaUzWV6hKmB8L0xCk'
};

// ============================================================
// Interruptor maestro de la experiencia V2 (docs/PLAN_V2.md).
// Cascada: ?v2=on|off en la URL  >  localStorage  >  este default.
// Kill-switch en demo: agregar ?v2=off a la URL y recargar.
// ============================================================
window.appConfig = { v2: false };

window.luxV2Enabled = function () {
    try {
        var p = new URL(window.location.href).searchParams.get('v2');
        if (p === 'on' || p === '1') { localStorage.setItem('lux.v2.override', 'on'); return true; }
        if (p === 'off' || p === '0') { localStorage.setItem('lux.v2.override', 'off'); return false; }
        var o = localStorage.getItem('lux.v2.override');
        if (o === 'on') return true;
        if (o === 'off') return false;
    } catch (e) { /* almacenamiento bloqueado: usar el default */ }
    return !!(window.appConfig && window.appConfig.v2);
};
