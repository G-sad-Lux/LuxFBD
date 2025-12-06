
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
    const { titulo, categoria_id, detalles, prioridad_id, area_notificada_id } = await req.json()

    // Basic Validation
    if (!titulo || !categoria_id) {
        throw new Error('Missing required fields: titulo, categoria_id')
    }

    // Insert Ticket (Assuming 'reportador_id' matches Auth User or linked profile)
    // Since 'ticket' table expects a numeric ID for reportador_id (fk to usuario), we need to resolve it.

    // 1. Get Numeric ID from public.usuario
    const { data: profile, error: profileError } = await supabase
        .from('usuario')
        .select('usuario_id')
        .eq('auth_uid', user.id)
        .single()

    if (profileError || !profile) {
        throw new Error('User profile not found in database. Please contact support.')
    }

    // 2. Insert
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
                area_notificada_id: 38 // Default fallback, but client should send it
            }
        ])
        .select()

    if (error) throw error

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

    // If student, filter by own tickets
    if (profile.tipo_usuario === 'estudiante') {
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

    return new Response(JSON.stringify({ ticket, history: historyData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    })
}
