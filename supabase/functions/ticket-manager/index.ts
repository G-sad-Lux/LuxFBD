
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const url = new URL(req.url)
        // Route dispatcher
        if (req.method === 'POST' && url.pathname.endsWith('/create')) {
            return await createTicket(req, supabaseClient, user)
        } else if (req.method === 'GET' && url.pathname.endsWith('/list')) {
            return await listTickets(req, supabaseClient, user)
        } else if (req.method === 'GET' && url.pathname.endsWith('/details')) {
            return await getTicketDetails(req, url, supabaseClient, user)
        } else if (req.method === 'PUT' && url.pathname.endsWith('/update')) {
            return await updateTicket(req, supabaseClient, user)
        } else if (req.method === 'GET' && url.pathname.endsWith('/staff')) {
            return await listStaff(req, supabaseClient, user)
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

async function createTicket(req: Request, supabase: any, user: any) {
    const { titulo, categoria_id, detalles, prioridad_id, area_notificada_id, adjunto } = await req.json()

    // Basic Validation
    if (!titulo || !categoria_id) {
        throw new Error('Missing required fields: titulo, categoria_id')
    }

    // Insert Ticket (Assuming 'reportador_id' matches Auth User or linked profile)

    // 1. Get Numeric ID from public.usuario
    const { data: profile, error: profileError } = await supabase
        .from('usuario')
        .select('usuario_id')
        .eq('auth_uid', user.id)
        .single()

    if (profileError || !profile) {
        throw new Error('User profile not found in database. Please contact support.')
    }

    // 2. Insert Ticket
    const { data, error } = await supabase
        .from('ticket')
        .insert([
            {
                titulo,
                categoria_id,
                detalles,
                prioridad_id: prioridad_id || 8, // Default 'Bajo'
                reportador_id: profile.usuario_id,
                estado_id: 1, // 'Abierto'
                area_notificada_id: 38 // Default fallback
            }
        ])
        .select()
        .single()

    if (error) throw error

    // 3. Insert Attachment if present
    if (adjunto && data) {
        /*
          adjunto payload expected: {
             nombre_archivo: string,
             ruta_archivo_url: string,
             size_bytes: number,
             mime_type: string
          }
        */
        const { error: adjErr } = await supabase
            .from('adjunto')
            .insert({
                ticket_id: data.ticket_id,
                subido_por_id: profile.usuario_id,
                nombre_archivo: adjunto.nombre_archivo,
                ruta_archivo_url: adjunto.ruta_archivo_url,
                mime_type: adjunto.mime_type,
                size_bytes: adjunto.size_bytes || 0,
                // bucket_id defaulted to 'tickets'
                bucket_id: 'tickets',
                fecha_subida: new Date().toISOString()
            })

        if (adjErr) console.error('Error saving attachment:', adjErr)
    }

    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
    })
}

async function listTickets(req: Request, supabase: any, user: any) {
    // 1. Get user profile to check role or ID
    const { data: profile } = await supabase
        .from('usuario')
        .select('usuario_id, tipo_usuario')
        .eq('auth_uid', user.id)
        .single()

    if (!profile) throw new Error('Profile not found')

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

    // If student or maestro, filter by own tickets (using names from DB)
    if (['Alumno', 'Maestro', 'estudiante'].includes(profile.tipo_usuario)) {
        query = query.eq('reportador_id', profile.usuario_id)
    }

    const { data, error } = await query

    if (error) throw error

    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

async function getTicketDetails(req: Request, url: URL, supabase: any, user: any) {
    const ticketId = url.searchParams.get('id')
    if (!ticketId) throw new Error('Missing ticket ID')

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

    if (tErr) throw tErr

    let historyData = []
    try {
        const { data: hist } = await supabase
            .from('historial')
            .select(`*, autor:autor_id(nombre, apellido)`)
            .eq('ticket_id', ticketId)
            .order('fecha_cambio', { ascending: false })

        if (hist) historyData = hist
    } catch (e) { console.warn('History fetch error:', e) }

    // Fetch Attachments (adjunto table)
    let attachments = []
    try {
        const { data: att } = await supabase
            .from('adjunto')
            .select('*')
            .eq('ticket_id', ticketId)
        if (att) attachments = att
    } catch (e) { console.warn('Attachment fetch error:', e) }

    return new Response(JSON.stringify({ ticket, history: historyData, attachments }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    })
}

async function updateTicket(req: Request, supabase: any, user: any) {
    const { ticket_id, maestro_notificado_id, estado_id } = await req.json()

    if (!ticket_id) throw new Error('Missing ticket ID')

    // 1. Check Permissions
    // Only 'Administrativo' or 'Maestro' can assign/update tickets
    const { data: profile } = await supabase
        .from('usuario')
        .select('usuario_id, tipo_usuario, nombre, apellido')
        .eq('auth_uid', user.id)
        .single()

    if (!profile) throw new Error('Profile not found')

    const allowedRoles = ['Administrativo', 'Maestro', 'Soporte']
    if (!allowedRoles.includes(profile.tipo_usuario)) {
        throw new Error('Unauthorized to update tickets')
    }

    // 2. Prepare Update Payload
    const updates: any = {}
    if (maestro_notificado_id !== undefined) updates.maestro_notificado_id = maestro_notificado_id
    if (estado_id !== undefined) updates.estado_id = estado_id

    if (Object.keys(updates).length === 0) {
        throw new Error('No fields to update')
    }

    // 3. Update Ticket
    const { data, error } = await supabase
        .from('ticket')
        .update(updates)
        .eq('ticket_id', ticket_id)
        .select()
        .single()

    if (error) throw error

    // 4. Log History
    // 4. Log History with Custom Message
    try {
        let historyMsg = 'Actualización administrativa'
        let newValue = '-'

        if (maestro_notificado_id) {
            // Fetch target user name
            const { data: targetUser } = await supabase
                .from('usuario')
                .select('nombre, apellido')
                .eq('usuario_id', maestro_notificado_id)
                .single()

            const targetName = targetUser ? `${targetUser.nombre} ${targetUser.apellido}` : `ID ${maestro_notificado_id}`
            const actorName = `${profile.nombre} ${profile.apellido}`

            // Format: "[UsuarioAsignado] Reasigno la tarea a [Usuario Reasignado]"
            // "Ana Gonzalez" Reasigno la tarea a "Alberto Teacher"
            historyMsg = `[${actorName}] Reasignó la tarea a [${targetName}]`
            newValue = targetName
        } else if (estado_id) {
            newValue = `Estado ${estado_id}`
        }

        await supabase.from('historial').insert({
            ticket_id,
            autor_id: profile.usuario_id,
            campo_modificado: 'Asignación/Estado',
            valor_anterior: '-',
            valor_nuevo: newValue,
            cambio: historyMsg
        })
    } catch (e) { console.warn('History log failed', e) }

    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    })
}

async function listStaff(req: Request, supabase: any, user: any) {
    // Only fetch users who can be assigned tickets (Admin, Maestro, Agente, Soporte, Administrativo)
    const { data, error } = await supabase
        .from('usuario')
        .select('usuario_id, nombre, apellido, tipo_usuario')
        .in('tipo_usuario', ['Administrativo', 'Maestro', 'Soporte', 'Administrador'])
        .order('nombre')

    if (error) throw error

    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}
