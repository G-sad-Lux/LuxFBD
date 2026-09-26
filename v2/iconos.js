/* ============================================================
   Iconos de trazo del diseño v2. Uso:
   '<svg class="v2-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + LuxIconos.categoria.acceso + '"/></svg>'
   CSS sugerido:
   .v2-ico { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8;
             stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
   ============================================================ */
window.LuxIconos = {
    // Por codigo de catalogo (migracion 0014)
    categoria: {
        acceso: 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M11.5 11H21 M17 11v3 M20 11v2',
        plataforma: 'M3 4h18v12H3z M8 20h8 M12 16v4',
        materias: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 19V5 M9 7h6',
        servicios_escolares: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6',
        finanzas: 'M3 6h18v12H3z M3 10h18 M7 15h4',
        otros: 'M5 12h.01 M12 12h.01 M19 12h.01'
    },
    canal: {
        lumix: 'M4 5h16v11H9l-5 4z',
        portal: 'M3 4h18v12H3z M8 20h8 M12 16v4'
    },
    ui: {
        dashboard: 'M3 11l9-7 9 7 M5 10v10h14V10',
        ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z M14 7v10',
        reportes: 'M4 20V10 M10 20V4 M16 20v-7 M3 20h18',
        catalogos: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
        usuarios: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 15c2 .7 3 2.3 3.5 5',
        config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M4 12h2 M18 12h2 M12 4v2 M12 18v2 M6.3 6.3l1.4 1.4 M16.3 16.3l1.4 1.4 M6.3 17.7l1.4-1.4 M16.3 7.7l1.4-1.4',
        campana: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0',
        salir: 'M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10',
        buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
        filtro: 'M4 5h16l-6 8v5l-4 2v-7z',
        exportar: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
        mas: 'M12 5v14 M5 12h14',
        clip: 'M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7',
        camara: 'M4 8h3l2-3h6l2 3h3v11H4z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
        enviar: 'M4 12l16-8-6 16-2.5-6.5z M11.5 13.5L20 4',
        candado: 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
        reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
        alerta: 'M12 4l9 16H3z M12 10v4 M12 17v.5',
        info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8v.01',
        check: 'M5 12.5l4.5 4.5L19 7',
        checkCirculo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8 12.5l3 3 5-6',
        reasignar: 'M4 8h14 M14 4l4 4-4 4 M20 16H6 M10 12l-4 4 4 4',
        bandera: 'M5 21V4 M5 4h11l-2 4 2 4H5',
        historial: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5 M12 8v4l3 2',
        sinAsignar: 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M3 20c1.3-3.3 4-5 7-5 1.4 0 2.7.3 3.8 1 M16 16l5 5 M21 16l-5 5',
        persona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5',
        calendario: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5',
        ojo: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
        zoom: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4 M11 8v6 M8 11h6',
        atras: 'M19 12H5 M11 6l-6 6 6 6',
        siguiente: 'M9 6l6 6-6 6',
        anterior: 'M15 6l-6 6 6 6',
        cerrar: 'M6 6l12 12 M18 6L6 18',
        qr: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 18h2v2h-2z M14 18h2 M18 14h2',
        rayo: 'M13 2L4 14h7l-1 8 9-12h-7z',
        celular: 'M7 2h10v20H7z M11 18h2',
        escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5'
    }
};
