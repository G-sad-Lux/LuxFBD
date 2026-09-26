
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS con allowlist: solo el sitio publicado y dev local.
const ALLOWED_ORIGINS = [
    'https://g-sad-lux.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
const corsFor = (req: Request) => {
    const origin = req.headers.get('Origin') ?? ''
    return {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        'Vary': 'Origin',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    }
}

// Errores de validacion propios: se exponen al cliente. Todo lo demas
// responde un mensaje generico y el detalle queda en los logs.
const httpError = (message: string, status = 400) =>
    Object.assign(new Error(message), { expose: true, status })

// Las reglas de negocio viven en la DB (migracion 0010) y avisan con
// RAISE EXCEPTION (codigo P0001): esos mensajes SI son para el usuario.
const fromDb = (error: any) =>
    error?.code === 'P0001' ? httpError(String(error.message), 422) : error

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsFor(req) })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsFor(req), 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const url = new URL(req.url)
        if (req.method === 'POST' && url.pathname.endsWith('/create')) {
            return await createTicket(req, supabaseClient, user)
        } else if (req.method === 'GET' && url.pathname.endsWith('/list')) {
            return await listTickets(req, supabaseClient, user)
        } else if (req.method === 'GET' && url.pathname.endsWith('/details')) {
            return await getTicketDetails(req, url, supabaseClient, user)
        } else if (req.method === 'PUT' && url.pathname.endsWith('/update')) {
            return await updateTicket(req, supabaseClient, user)
        } else if (req.method === 'GET' && url.pathname.endsWith('/comments')) {
            return await listComments(req, url, supabaseClient, user)
        } else if (req.method === 'POST' && url.pathname.endsWith('/comments')) {
            return await createComment(req, supabaseClient, user)
        } else if (req.method === 'GET' && url.pathname.endsWith('/staff')) {
            return await listStaff(req, supabaseClient, user)
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            headers: { ...corsFor(req), 'Content-Type': 'application/json' },
            status: 405,
        })

    } catch (error) {
        console.error('ticket-manager error:', error)
        const status = (error as { status?: number })?.status ?? 400
        const message = (error as { expose?: boolean })?.expose
            ? (error as Error).message
            : 'Error interno del servidor'
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsFor(req), 'Content-Type': 'application/json' },
            status,
        })
    }
})

async function getProfile(supabase: any, user: any) {
    const { data: profile } = await supabase
        .from('usuario')
        .select('usuario_id, tipo_usuario, nombre, apellido')
        .eq('auth_uid', user.id)
        .single()
    if (!profile) throw httpError('User profile not found in database. Please contact support.', 404)
    return profile
}

const STAFF_ROLES = ['Administrativo', 'Soporte', 'Administrador'] // alineado con es_staff()

async function createTicket(req: Request, supabase: any, user: any) {
    const { titulo, categoria_id, detalles, prioridad_id, area_notificada_id, adjunto, canal_entrada } = await req.json()

    if (!titulo || !categoria_id) {
        throw httpError('Missing required fields: titulo, categoria_id')
    }

    const profile = await getProfile(supabase, user)

    // La DB (0010) valida tipos de catalogo, calcula la ETA y escribe la
    // bitacora + notificacion de creacion.
    const { data, error } = await supabase
        .from('ticket')
        .insert([
            {
                titulo,
                categoria_id,
                detalles,
                prioridad_id: prioridad_id || 8,             // oficial (default Baja)
                prioridad_reportada_id: prioridad_id || null, // lo que percibio el usuario (V2 §10)
                reportador_id: profile.usuario_id,
                estado_id: 1, // 'Abierto'
                area_notificada_id: area_notificada_id || 38, // B9: se respeta el area elegida
                canal_entrada: canal_entrada === 'portal' ? 'portal' : 'chatbot',
            }
        ])
        .select()
        .single()

    if (error) throw fromDb(error)

    if (adjunto && data) {
        const { error: adjErr } = await supabase
            .from('adjunto')
            .insert({
                ticket_id: data.ticket_id,
                subido_por_id: profile.usuario_id,
                nombre_archivo: adjunto.nombre_archivo,
                ruta_archivo_url: adjunto.ruta_archivo_url, // ruta en el bucket privado
                mime_type: adjunto.mime_type,
                size_bytes: adjunto.size_bytes || 0,
                bucket_id: 'tickets',
                fecha_subida: new Date().toISOString()
            })
        if (adjErr) console.error('Error saving attachment:', adjErr)
    }

    return new Response(JSON.stringify(data), {
        headers: { ...corsFor(req), 'Content-Type': 'application/json' },
        status: 201,
    })
}

async function listTickets(req: Request, supabase: any, user: any) {
    const profile = await getProfile(supabase, user)

    let query = supabase
        .from('ticket')
        .select(`
            *,
            catalogo:categoria_id(nombre),
            prioridad:prioridad_id(nombre, codigo),
            estado:estado_id(nombre),
            area:area_notificada_id(nombre),
            reportador:reportador_id(nombre, apellido, tipo_usuario),
            asignado:maestro_notificado_id(nombre, apellido)
        `)
        .order('fecha_creacion', { ascending: false })

    // RLS ya acota lo visible; este filtro es solo presentacion.
    if (!STAFF_ROLES.includes(profile.tipo_usuario)) {
        query = query.eq('reportador_id', profile.usuario_id)
    }

    const { data, error } = await query
    if (error) throw fromDb(error)

    return new Response(JSON.stringify(data), {
        headers: { ...corsFor(req), 'Content-Type': 'application/json' },
    })
}

async function getTicketDetails(req: Request, url: URL, supabase: any, user: any) {
    const ticketId = url.searchParams.get('id')
    if (!ticketId) throw httpError('Missing ticket ID')

    // Todo con el JWT del usuario: RLS deniega tickets ajenos antes de
    // tocar historial, comentarios o adjuntos. (El service role ya no se usa.)
    const { data: ticket, error: tErr } = await supabase
        .from('ticket')
        .select(`
            *,
            catalogo:categoria_id(nombre),
            prioridad:prioridad_id(nombre, codigo),
            estado:estado_id(nombre),
            area:area_notificada_id(nombre),
            reportador:reportador_id(nombre, apellido, tipo_usuario),
            asignado:maestro_notificado_id(nombre, apellido)
        `)
        .eq('ticket_id', ticketId)
        .single()

    if (tErr) throw fromDb(tErr)

    let historyData = []
    try {
        const { data: hist } = await supabase
            .from('historial')
            .select(`*, autor:autor_id(nombre, apellido)`)
            .eq('ticket_id', ticketId)
            .order('fecha_cambio', { ascending: false })
        if (hist) historyData = hist
    } catch (e) { console.warn('History fetch error:', e) }

    // RLS oculta las notas internas a quien no es staff (0011).
    let comments = []
    try {
        const { data: com } = await supabase
            .from('comentario')
            .select(`*, autor:autor_id(nombre, apellido, tipo_usuario)`)
            .eq('ticket_id', ticketId)
            .order('fecha_creacion', { ascending: true })
        if (com) comments = com
    } catch (e) { console.warn('Comments fetch error:', e) }

    let attachments = []
    try {
        const { data: att } = await supabase
            .from('adjunto')
            .select('*')
            .eq('ticket_id', ticketId)
        if (att) attachments = att
    } catch (e) { console.warn('Attachment fetch error:', e) }

    // Bucket privado: la ruta guardada se convierte en URL firmada (1 h);
    // la politica de storage decide quien puede firmar.
    for (const att of attachments) {
        try {
            let path = String(att.ruta_archivo_url ?? '')
            if (path.startsWith('http')) {
                const marker = '/tickets/'
                const idx = path.indexOf(marker)
                if (idx === -1) continue
                path = decodeURIComponent(path.slice(idx + marker.length))
            }
            const { data: signed } = await supabase.storage
                .from('tickets')
                .createSignedUrl(path, 3600)
            if (signed?.signedUrl) att.ruta_archivo_url = signed.signedUrl
        } catch (_e) { /* sin firma: la UI muestra solo el nombre */ }
    }

    return new Response(JSON.stringify({ ticket, history: historyData, comments, attachments }), {
        headers: { ...corsFor(req), 'Content-Type': 'application/json' },
        status: 200,
    })
}

async function updateTicket(req: Request, supabase: any, user: any) {
    const { ticket_id, maestro_notificado_id, estado_id, prioridad_id, resumen_solucion } = await req.json()

    if (!ticket_id) throw httpError('Missing ticket ID')

    const profile = await getProfile(supabase, user)
    if (!STAFF_ROLES.includes(profile.tipo_usuario)) {
        throw httpError('Unauthorized to update tickets', 403)
    }

    const updates: any = {}
    if (maestro_notificado_id !== undefined) updates.maestro_notificado_id = maestro_notificado_id
    if (estado_id !== undefined) updates.estado_id = estado_id
    if (prioridad_id !== undefined) updates.prioridad_id = prioridad_id
    if (resumen_solucion !== undefined) updates.resumen_solucion = resumen_solucion

    if (Object.keys(updates).length === 0) {
        throw httpError('No fields to update')
    }

    // La DB valida transiciones/resumen/tipos, recalcula el SLA y escribe
    // bitacora + notificaciones (0010). Sus RAISE llegan como P0001.
    const { data, error } = await supabase
        .from('ticket')
        .update(updates)
        .eq('ticket_id', ticket_id)
        .select()
        .single()

    if (error) throw fromDb(error)

    return new Response(JSON.stringify(data), {
        headers: { ...corsFor(req), 'Content-Type': 'application/json' },
        status: 200,
    })
}

async function listComments(req: Request, url: URL, supabase: any, user: any) {
    const ticketId = url.searchParams.get('id')
    if (!ticketId) throw httpError('Missing ticket ID')

    const { data, error } = await supabase
        .from('comentario')
        .select(`*, autor:autor_id(nombre, apellido, tipo_usuario)`)
        .eq('ticket_id', ticketId)
        .order('fecha_creacion', { ascending: true })

    if (error) throw fromDb(error)

    return new Response(JSON.stringify(data), {
        headers: { ...corsFor(req), 'Content-Type': 'application/json' },
    })
}

async function createComment(req: Request, supabase: any, user: any) {
    const { ticket_id, contenido, tipo } = await req.json()

    if (!ticket_id) throw httpError('Missing ticket ID')
    const texto = String(contenido ?? '').trim()
    if (!texto) throw httpError('El comentario no puede estar vacío')
    if (texto.length > 2000) throw httpError('El comentario no puede exceder 2000 caracteres')
    const tipoFinal = tipo === 'interno' ? 'interno' : 'externo'

    const profile = await getProfile(supabase, user)

    // RLS (0011) exige: autor propio, ticket visible y "interno" solo staff.
    // El trigger (0010) escribe bitacora, notifica y aplica la transicion
    // Esperando respuesta -> En proceso cuando responde el reportador.
    const { data, error } = await supabase
        .from('comentario')
        .insert({
            ticket_id,
            autor_id: profile.usuario_id,
            tipo: tipoFinal,
            contenido: texto,
        })
        .select(`*, autor:autor_id(nombre, apellido, tipo_usuario)`)
        .single()

    if (error) {
        if (error.code === '42501') throw httpError('No estás autorizado para comentar en este ticket', 403)
        throw fromDb(error)
    }

    return new Response(JSON.stringify(data), {
        headers: { ...corsFor(req), 'Content-Type': 'application/json' },
        status: 201,
    })
}

async function listStaff(req: Request, supabase: any, user: any) {
    // RLS devuelve vacio a quien no es staff.
    const { data, error } = await supabase
        .from('usuario')
        .select('usuario_id, nombre, apellido, tipo_usuario')
        .in('tipo_usuario', ['Administrativo', 'Maestro', 'Soporte', 'Administrador'])
        .order('nombre')

    if (error) throw fromDb(error)

    return new Response(JSON.stringify(data), {
        headers: { ...corsFor(req), 'Content-Type': 'application/json' },
    })
}
