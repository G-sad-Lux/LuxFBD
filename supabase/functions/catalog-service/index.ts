
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
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) })

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const [cats, prios, estados, areas] = await Promise.all([
            supabaseClient.from('catalogo').select('catalogo_id, nombre, codigo').eq('tipo', 'categoria').order('orden'),
            supabaseClient.from('catalogo').select('catalogo_id, nombre, codigo').eq('tipo', 'prioridad').order('orden'),
            supabaseClient.from('catalogo').select('catalogo_id, nombre, codigo').eq('tipo', 'estado').order('orden'),
            supabaseClient.from('catalogo').select('catalogo_id, nombre, codigo').eq('tipo', 'area').order('orden')
        ])

        const response = {
            categorias: cats.data || [],
            prioridades: prios.data || [],
            estados: estados.data || [],
            areas: areas.data || []
        }

        return new Response(JSON.stringify(response), {
            headers: { ...corsFor(req), 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        // Detalle a los logs; al cliente solo un mensaje generico.
        console.error('catalog-service error:', error)
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            headers: { ...corsFor(req), 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
