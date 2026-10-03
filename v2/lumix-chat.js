// Motor del asistente Lumix: modo 'pantalla' (lumix.html) y modo 'embebido'
// (panel de alumnos.html). Cargar después de shared.js e iconos.js; requiere sesión.
(function () {
    'use strict';
    const esc = window.LuxV2.esc;

    // Respaldo estático por si catalog-service no responde (IDs de la semilla)
    const CATS_FALLBACK = [
        { catalogo_id: 37, nombre: 'Acceso y bloqueos', codigo: 'acceso' }, { catalogo_id: 34, nombre: 'Plataforma virtual', codigo: 'plataforma' },
        { catalogo_id: 36, nombre: 'Materias', codigo: 'materias' }, { catalogo_id: 42, nombre: 'Servicios escolares', codigo: 'servicios_escolares' },
        { catalogo_id: 33, nombre: 'Finanzas y pagos', codigo: 'finanzas' }, { catalogo_id: 35, nombre: 'Otros', codigo: 'otros' },
    ];
    const AREAS_FALLBACK = [
        { catalogo_id: 38, nombre: 'Soporte Técnico' }, { catalogo_id: 39, nombre: 'Servicios Escolares' },
        { catalogo_id: 40, nombre: 'Cajas' }, { catalogo_id: 41, nombre: 'Administración' },
    ];

    // opts: { raiz, perfil, catalogs, modo, alVerTicket(id), alCrear(ticket) }
    function montar(opts) {
        const { svgIcono, iconoCategoria, fmtHora, fmtFecha, nombreDe } = window.LuxV2.ui;
        const modo = opts.modo || 'pantalla';
        const catalogs = opts.catalogs || null;
        // editando=true: corrección lanzada desde el RESUMEN; al capturar se vuelve al resumen.
        const state = { step: 'INIT', ticket: {}, subiendo: false, editando: false };

        // ---- esqueleto: mensajes + barra tipo pill ----
        opts.raiz.innerHTML =
            '<div class="lumix-msgs"></div>' +
            '<form class="lumix-input">' +
            '<div class="pill">' +
            '<label style="position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0);">Mensaje para Lumix</label>' +
            '<input type="text" class="lx-texto" placeholder="Escribe un mensaje…" maxlength="5000" autocomplete="off" disabled>' +
            '<button type="button" class="lx-adjuntar" aria-label="Adjuntar archivo" disabled>' + svgIcono('ui.clip') + '</button>' +
            '<button type="button" class="lx-camara" aria-label="Tomar foto" disabled>' + svgIcono('ui.camara') + '</button>' +
            '</div>' +
            '<button type="submit" class="enviar" aria-label="Enviar mensaje" disabled>' + svgIcono('ui.enviar') + '</button>' +
            '<input type="file" class="lx-archivo" accept="image/png,image/jpeg,application/pdf" hidden>' +
            '<input type="file" class="lx-camara-input" accept="image/png,image/jpeg" capture="environment" hidden>' +
            '</form>';
        const $q = (sel) => opts.raiz.querySelector(sel);
        const msgs = $q('.lumix-msgs'), barra = $q('form'),
            texto = $q('.lx-texto'), btnEnviar = $q('.enviar'),
            btnAdjuntar = $q('.lx-adjuntar'), btnCamara = $q('.lx-camara'),
            archivo = $q('.lx-archivo'), camara = $q('.lx-camara-input');

        // ---- primitivas de chat ----
        function burbujaBot(textoMsg, extraHtml) {
            const fila = document.createElement('div');
            fila.className = 'fila-bot';
            const cuerpo = document.createElement('div');
            cuerpo.style.minWidth = '0';
            const b = document.createElement('div');
            b.className = 'msg-bot';
            b.textContent = textoMsg;
            if (extraHtml) {
                b.style.display = 'flex'; b.style.flexDirection = 'column'; b.style.gap = '10px';
                const extra = document.createElement('div');
                extra.innerHTML = extraHtml;
                b.appendChild(extra);
            }
            const hora = document.createElement('div');
            hora.className = 'hora';
            hora.textContent = fmtHora(new Date());
            cuerpo.appendChild(b); cuerpo.appendChild(hora);
            fila.innerHTML = '<img class="ava" src="assets/lumix-avatar.png" alt="">';
            fila.appendChild(cuerpo);
            msgs.appendChild(fila);
            msgs.scrollTop = msgs.scrollHeight;
            return b;
        }
        function burbujaUser(textoMsg) {
            const b = document.createElement('div');
            b.className = 'msg-user';
            b.textContent = textoMsg;
            msgs.appendChild(b);
            const hora = document.createElement('div');
            hora.className = 'hora der';
            hora.innerHTML = esc(fmtHora(new Date())) + svgIcono('ui.check', 'chica');
            msgs.appendChild(hora);
            msgs.scrollTop = msgs.scrollHeight;
            return b;
        }
        function chips(opciones) {
            const c = document.createElement('div');
            c.className = 'chips' + (opciones.length === 1 ? ' una' : '');
            opciones.forEach(op => {
                let el;
                if (op.href) {
                    el = document.createElement('a');
                    el.href = op.href;
                } else {
                    el = document.createElement('button');
                    el.type = 'button';
                    el.addEventListener('click', () => {
                        c.classList.add('usadas'); // las opciones usadas se apagan
                        (op.accion ? op.accion() : manejar(op.value, op.label));
                    });
                }
                if (op.icono) { el.innerHTML = op.icono + '<span></span>'; el.lastChild.textContent = op.label; }
                else el.textContent = op.label;
                if (op.principal) el.classList.add('principal');
                c.appendChild(el);
            });
            msgs.appendChild(c);
            msgs.scrollTop = msgs.scrollHeight;
            return c;
        }
        function habilitarTexto(si, conAdjunto) {
            texto.disabled = !si;
            btnEnviar.disabled = !si;
            btnEnviar.classList.toggle('activo', !!si && texto.value.trim() !== '');
            btnAdjuntar.disabled = !conAdjunto;
            btnCamara.disabled = !conAdjunto;
            if (si && modo === 'pantalla') texto.focus();
        }
        texto.addEventListener('input', () => {
            btnEnviar.classList.toggle('activo', texto.value.trim() !== '');
        });
        function apagarChipsPrevios() {
            msgs.querySelectorAll('.chips:not(.usadas)').forEach(c => c.classList.add('usadas'));
        }
        function diaChip() {
            const d = document.createElement('div');
            d.className = 'dia';
            d.textContent = 'Hoy';
            msgs.appendChild(d);
        }
        const verTicket = (id) => { if (opts.alVerTicket) opts.alVerTicket(id); };
        // Opciones del paso de evidencia; tambien se reponen cuando una subida falla.
        function chipsEvidencia() {
            chips([
                { label: 'Adjuntar archivo', value: 'adjuntar', icono: svgIcono('ui.clip', 'media') },
                { label: 'Tomar foto', value: 'foto', icono: svgIcono('ui.camara', 'media') },
                { label: (state.editando && state.ticket.adjunto) ? 'Quitar la evidencia' : 'Continuar sin evidencia', value: 'sin_adjunto' },
            ]);
        }

        // ---- pasos del flujo ----
        function prompt(step) {
            state.step = step;
            habilitarTexto(false, false);
            switch (step) {
                case 'GREETING': {
                    state.ticket = {};
                    const nombre = opts.perfil ? opts.perfil.nombre : '';
                    burbujaBot(modo === 'embebido'
                        ? '¡Hola' + (nombre ? ', ' + nombre : '') + '! Soy Lumix. Te ayudo a registrar un nuevo reporte sin salir de Mis Tickets.'
                        : '¡Hola' + (nombre ? ', ' + nombre : '') + '! Soy Lumix, tu asistente de soporte. ¿En qué puedo ayudarte hoy?');
                    chips([
                        { label: 'Reportar un problema', value: 'report', principal: true },
                        { label: 'Consultar mi ticket', value: 'status' },
                    ]);
                    break;
                }
                case 'TITLE':
                    burbujaBot('De acuerdo. Escribe un título breve que resuma tu problema (mínimo 5 letras).');
                    habilitarTexto(true, false);
                    break;
                case 'CATEGORY': {
                    burbujaBot('¿Qué tipo de problema es?');
                    const cats = (catalogs && catalogs.categorias.length ? catalogs.categorias : CATS_FALLBACK);
                    chips(cats.map(c => ({
                        label: c.nombre, value: 'cat:' + c.catalogo_id,
                        icono: iconoCategoria(c.codigo || c.nombre, 'media'),
                    })));
                    break;
                }
                case 'DETAILS':
                    burbujaBot('Describe con detalle qué ocurre: qué intentabas hacer, desde cuándo y qué mensaje aparece (mínimo 15 letras).');
                    habilitarTexto(true, false);
                    break;
                case 'AREA': {
                    burbujaBot('¿Con qué área crees que está relacionado? Si no estás seguro, el equipo de soporte lo definirá.');
                    const areas = (catalogs && catalogs.areas.length ? catalogs.areas : AREAS_FALLBACK);
                    chips(areas.map(a => ({ label: a.nombre, value: 'area:' + a.catalogo_id }))
                        .concat([{ label: 'No estoy seguro', value: 'area:auto' }]));
                    break;
                }
                case 'EVIDENCE':
                    burbujaBot(state.editando && state.ticket.adjunto
                        ? 'Tu evidencia actual es "' + state.ticket.adjunto.nombre_archivo + '". Puedes reemplazarla o quitarla.'
                        : 'Puedes agregar una evidencia para ayudarnos a revisar tu caso: captura de pantalla, foto o PDF (máx. 5 MB).');
                    habilitarTexto(false, true);
                    chipsEvidencia();
                    break;
                case 'RESUMEN': {
                    const t = state.ticket;
                    const catNombre = ((catalogs && catalogs.categorias) || CATS_FALLBACK)
                        .concat(CATS_FALLBACK).find(c => c.catalogo_id === t.categoria_id);
                    const areaNombre = t.area_id
                        ? ((((catalogs && catalogs.areas) || AREAS_FALLBACK).concat(AREAS_FALLBACK)).find(a => a.catalogo_id === t.area_id) || {}).nombre
                        : 'La define soporte';
                    burbujaBot('Revisa el resumen de tu reporte:',
                        '<dl class="kv">' +
                        '<dt>Título</dt><dd>' + esc(t.titulo) + '</dd>' +
                        '<dt>Categoría</dt><dd>' + esc(catNombre ? catNombre.nombre : '—') + '</dd>' +
                        '<dt>Área</dt><dd>' + esc(areaNombre) + '</dd>' +
                        '<dt>Evidencia</dt><dd>' + esc(t.adjunto ? t.adjunto.nombre_archivo : 'Sin evidencia') + '</dd>' +
                        '</dl>' +
                        '<span style="font-size:12px; color:var(--v2-muted);">La prioridad la asigna el equipo de soporte según las reglas de la universidad.</span>');
                    chips([
                        { label: 'Confirmar y enviar', value: 'confirmar', principal: true },
                        { label: 'Corregir algo', value: 'corregir' },
                        { label: 'Empezar de nuevo', value: 'reiniciar' },
                    ]);
                    break;
                }
                case 'CORRIGE':
                    burbujaBot('¿Qué quieres corregir?');
                    chips([
                        { label: 'El título', value: 'edit:TITLE' },
                        { label: 'La categoría', value: 'edit:CATEGORY' },
                        { label: 'Los detalles', value: 'edit:DETAILS' },
                        { label: 'El área', value: 'edit:AREA' },
                        { label: 'La evidencia', value: 'edit:EVIDENCE' },
                        { label: 'Nada, volver al resumen', value: 'edit:RESUMEN' },
                    ]);
                    break;
            }
        }
        // Al paso siguiente, o de vuelta al RESUMEN si era una corrección.
        function avanzar(siguiente) {
            if (state.editando) { state.editando = false; prompt('RESUMEN'); }
            else prompt(siguiente);
        }

        async function manejar(valor, etiqueta) {
            if (state.subiendo) return;
            switch (state.step) {
                case 'GREETING':
                    if (valor === 'report') { burbujaUser(etiqueta || 'Reportar un problema'); prompt('TITLE'); }
                    else if (valor === 'status') { burbujaUser(etiqueta || 'Consultar mi ticket'); consultarEstado(); }
                    break;
                case 'TITLE': {
                    const t = String(valor).trim();
                    if (!t) return;
                    if (t.length < 5) { burbujaUser(t); texto.value = ''; burbujaBot('El título es muy corto: dame al menos 5 letras.'); habilitarTexto(true, false); return; }
                    state.ticket.titulo = t;
                    burbujaUser(t); texto.value = '';
                    avanzar('CATEGORY');
                    break;
                }
                case 'CATEGORY':
                    if (String(valor).startsWith('cat:')) {
                        state.ticket.categoria_id = Number(String(valor).slice(4));
                        burbujaUser(etiqueta);
                        avanzar('DETAILS');
                    }
                    break;
                case 'DETAILS': {
                    const d = String(valor).trim();
                    if (!d) return;
                    if (d.length < 15) { burbujaUser(d); texto.value = ''; burbujaBot('Necesito un poco más de detalle (mínimo 15 letras) para ayudarte mejor.'); habilitarTexto(true, false); return; }
                    state.ticket.detalles = d;
                    burbujaUser(d); texto.value = '';
                    avanzar('AREA');
                    break;
                }
                case 'AREA':
                    if (String(valor).startsWith('area:')) {
                        const v = String(valor).slice(5);
                        state.ticket.area_id = v === 'auto' ? null : Number(v);
                        burbujaUser(etiqueta);
                        avanzar('EVIDENCE');
                    }
                    break;
                case 'EVIDENCE':
                    if (valor === 'adjuntar') { archivo.click(); }
                    else if (valor === 'foto') { camara.click(); }
                    else if (valor === 'sin_adjunto') {
                        if (state.editando && state.ticket.adjunto) {
                            state.ticket.adjunto = null; // corregir = quitar la evidencia previa
                            burbujaUser('Quitar la evidencia');
                        } else {
                            burbujaUser('Continuar sin evidencia');
                        }
                        state.editando = false;
                        prompt('RESUMEN');
                    }
                    break;
                case 'RESUMEN':
                    if (valor === 'confirmar') { burbujaUser('Confirmar y enviar'); crearTicket(); }
                    else if (valor === 'corregir') { burbujaUser('Corregir algo'); prompt('CORRIGE'); }
                    else if (valor === 'reiniciar') { reiniciar(); }
                    break;
                case 'CORRIGE':
                    if (String(valor).startsWith('edit:')) {
                        const destino = String(valor).slice(5);
                        burbujaUser(etiqueta);
                        if (destino === 'RESUMEN') { prompt('RESUMEN'); }
                        else { state.editando = true; prompt(destino); }
                    }
                    break;
                case 'DONE':
                    if (valor === 'report') { apagarChipsPrevios(); burbujaUser('Reportar otro problema'); state.ticket = {}; prompt('TITLE'); }
                    else if (valor === 'status') { apagarChipsPrevios(); burbujaUser('Consultar mi ticket'); consultarEstado(); }
                    break;
            }
        }

        // ---- evidencia (bucket privado; el servidor también valida) ----
        async function procesarArchivo(original) {
            const f = await window.LuxV2.comprimirImagen(original);
            const tipos = ['image/png', 'image/jpeg', 'application/pdf'];
            if (!tipos.includes(f.type)) { burbujaBot('Ese formato no está permitido: usa PNG, JPG o PDF.'); apagarChipsPrevios(); chipsEvidencia(); return; }
            if (f.size > 5 * 1024 * 1024) { burbujaBot('El archivo pesa más de 5 MB. Comprime la imagen o recorta el PDF.'); apagarChipsPrevios(); chipsEvidencia(); return; }
            state.subiendo = true;
            const aviso = burbujaBot('Subiendo ' + f.name + '…');
            try {
                const session = await window.LuxV2.getSession();
                const limpio = f.name.replace(/[^\w.-]/g, '');
                const ruta = session.user.id + '/' + Date.now() + '_' + limpio;
                const { error } = await window.LuxV2.sb().storage.from('tickets').upload(ruta, f);
                if (error) throw error;
                state.ticket.adjunto = { nombre_archivo: f.name, ruta_archivo_url: ruta, mime_type: f.type, size_bytes: f.size };
                aviso.textContent = 'Evidencia lista: ' + f.name;
                state.subiendo = false;
                state.editando = false;
                apagarChipsPrevios();
                burbujaUser('Adjunté "' + f.name + '"');
                prompt('RESUMEN');
            } catch (e) {
                console.error(e);
                state.subiendo = false;
                aviso.textContent = 'No pude subir el archivo. Intenta de nuevo o continúa sin evidencia.';
                apagarChipsPrevios();
                chipsEvidencia();
            }
        }
        archivo.addEventListener('change', () => { if (archivo.files.length) { const f = archivo.files[0]; archivo.value = ''; procesarArchivo(f); } });
        camara.addEventListener('change', () => { if (camara.files.length) { const f = camara.files[0]; camara.value = ''; procesarArchivo(f); } });

        // ---- crear ticket ----
        async function crearTicket() {
            state.step = 'CREANDO';
            habilitarTexto(false, false);
            burbujaBot('Registrando tu reporte…');
            try {
                const body = {
                    titulo: state.ticket.titulo,
                    categoria_id: state.ticket.categoria_id,
                    detalles: state.ticket.detalles,
                    canal_entrada: 'chatbot',
                    adjunto: state.ticket.adjunto || null,
                };
                if (state.ticket.area_id) body.area_notificada_id = state.ticket.area_id;
                const t = await window.LuxV2.callFn('ticket-manager/create', { method: 'POST', body });

                const card = document.createElement('div');
                card.className = 'card-exito';
                card.innerHTML =
                    '<span class="circulo">' + svgIcono('ui.check') + '</span>' +
                    '<div style="display:flex; flex-direction:column; gap:6px; min-width:0;">' +
                    '<strong style="font-size:14px; color:var(--v2-heading);">Reporte registrado correctamente</strong>' +
                    '<span class="folio">Ticket #' + esc(t.ticket_id) + '</span>' +
                    '<span class="v2-badge st-abierto" style="align-self:flex-start;">Estado: Abierto</span>' +
                    '<p>Recibimos tu reporte. El equipo de soporte lo revisará y te avisaremos de cada avance' + (modo === 'embebido' ? ' aquí mismo.' : ' aquí y en Mis Tickets.') + '</p>' +
                    (t.eta_estimada ? '<p><strong>Te atenderemos antes del:</strong> ' + esc(fmtFecha(t.eta_estimada)) + '</p>' : '') +
                    '<span class="hora" style="margin:0;">' + esc(fmtHora(new Date())) + '</span>' +
                    '</div>';
                msgs.appendChild(card);
                msgs.scrollTop = msgs.scrollHeight;

                state.step = 'DONE';
                if (opts.alCrear) { try { opts.alCrear(t); } catch (_) { } }
                chips([
                    (modo === 'embebido'
                        ? { label: 'Ver en mi lista', principal: true, accion: () => verTicket(t.ticket_id) }
                        : { label: 'Ver en Mis Tickets', href: 'alumnos.html#ticket=' + t.ticket_id, principal: true }),
                    { label: 'Reportar otro problema', value: 'report' },
                ]);
            } catch (err) {
                console.error(err);
                burbujaBot('No pude registrar el ticket: ' + err.message);
                state.step = 'RESUMEN';
                chips([
                    { label: 'Reintentar', value: 'confirmar', principal: true },
                    (modo === 'embebido'
                        ? { label: 'Cerrar', accion: () => { } }
                        : { label: 'Ir a Mis Tickets', href: 'alumnos.html' }),
                ]);
            }
        }

        // ---- consultar estado ----
        async function consultarEstado() {
            state.step = 'DONE';
            burbujaBot('Déjame revisar tus tickets…');
            try {
                const tickets = await window.LuxV2.callFn('ticket-manager/list');
                if (tickets.length === 0) {
                    burbujaBot('Aún no tienes tickets registrados. ¿Reportamos tu primer problema?');
                } else {
                    const activos = tickets.filter(t => ![4, 5].includes(t.estado_id));
                    const lista = (activos.length ? activos : tickets).slice(0, 4);
                    burbujaBot(activos.length
                        ? 'Tienes ' + activos.length + ' ticket(s) activo(s):'
                        : 'No tienes tickets activos; estos son los más recientes:');

                    // Qué pidió soporte en los "Esperando respuesta"
                    const faltantes = {};
                    await Promise.all(lista.filter(t => t.estado_id === 3).slice(0, 3).map(async t => {
                        try {
                            const det = await window.LuxV2.callFn('ticket-manager/details?id=' + t.ticket_id);
                            const staffMsgs = (det.comments || [])
                                .filter(c => c.autor && window.LuxV2.STAFF_ROLES.includes(c.autor.tipo_usuario))
                                .sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));
                            if (staffMsgs.length) faltantes[t.ticket_id] = staffMsgs[staffMsgs.length - 1].contenido;
                        } catch (_) { /* sin detalle: la tarjeta sale sin la línea */ }
                    }));

                    lista.forEach(t => {
                        const esBoton = modo === 'embebido';
                        const a = document.createElement(esBoton ? 'button' : 'a');
                        a.className = 'mini-ticket' + (t.estado_id === 3 ? ' esperando' : '');
                        if (esBoton) { a.type = 'button'; a.addEventListener('click', () => verTicket(t.ticket_id)); }
                        else a.href = 'alumnos.html#ticket=' + t.ticket_id;
                        const estadoNombre = t.estado ? t.estado.nombre : '—';
                        const codigo = estadoNombre.toLowerCase().replace(/\s+/g, '_');
                        a.innerHTML =
                            '<div class="linea1"><strong>#' + t.ticket_id + '</strong><span class="tit"></span>' +
                            '<span class="v2-badge st-' + esc(codigo) + '" style="height:22px; font-size:11px;">' + esc(estadoNombre) + '</span></div>' +
                            '<span class="sub"></span>' +
                            (faltantes[t.ticket_id] ? '<span class="falta"></span>' : '');
                        a.querySelector('.linea1 .tit').textContent = t.titulo;
                        a.querySelector('.sub').textContent =
                            (t.catalogo ? t.catalogo.nombre : '') +
                            (t.asignado ? ' · Atiende ' + nombreDe(t.asignado) : ' · Sin asignar') +
                            (t.area ? ' · ' + t.area.nombre : '');
                        if (faltantes[t.ticket_id]) a.querySelector('.falta').textContent = 'Soporte necesita: ' + faltantes[t.ticket_id];
                        msgs.appendChild(a);
                    });
                    msgs.scrollTop = msgs.scrollHeight;
                    if (tickets.length > lista.length) burbujaBot('…y ' + (tickets.length - lista.length) + ' más en Mis Tickets.');
                }
            } catch (e) {
                console.error(e);
                burbujaBot('No pude consultar tus tickets en este momento.');
            }
            burbujaBot('¿Algo más?');
            chips([
                { label: 'Reportar un problema', value: 'report', principal: true },
                (modo === 'embebido'
                    ? { label: 'Ver mi lista', accion: () => verTicket(null) }
                    : { label: 'Ver Mis Tickets', href: 'alumnos.html' }),
            ]);
        }

        // ---- reiniciar / arranque ----
        function reiniciar() {
            if (state.subiendo) return;
            msgs.innerHTML = '';
            state.ticket = {};
            state.editando = false;
            texto.value = '';
            diaChip();
            prompt('GREETING');
        }
        barra.addEventListener('submit', (e) => { e.preventDefault(); if (!texto.disabled) manejar(texto.value); });
        btnAdjuntar.addEventListener('click', () => archivo.click());
        btnCamara.addEventListener('click', () => camara.click());

        diaChip();
        prompt('GREETING');

        return { reiniciar, enCurso: () => state.step !== 'GREETING' && state.step !== 'DONE' };
    }

    window.LuxLumixChat = { montar };
})();
