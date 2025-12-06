
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        // Note: Catalog service might be public or protected. 
        // If protected, we need auth header. Assuming public for 'anon' key usage.
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Fetch all Catalogs in parallel for speed
        const [cats, prios, estados, areas] = await Promise.all([
            supabaseClient.from('catalogo').select('catalogo_id, nombre, codigo').eq('tipo', 'categoria'),
            supabaseClient.from('catalogo').select('catalogo_id, nombre, codigo').eq('tipo', 'prioridad'),
            supabaseClient.from('catalogo').select('catalogo_id, nombre, codigo').eq('tipo', 'estado'),
            supabaseClient.from('catalogo').select('catalogo_id, nombre, codigo').eq('tipo', 'area')
        ])

        const response = {
            categorias: cats.data || [],
            prioridades: prios.data || [],
            estados: estados.data || [],
            areas: areas.data || []
        }

        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
