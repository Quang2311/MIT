// supabase/functions/create-user/index.ts
// Edge Function: Admin creates user without losing own session
// Uses service_role key → auth.admin.createUser()

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Verify caller is admin
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Create client with caller's JWT to verify role
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user: caller } } = await callerClient.auth.getUser();
        if (!caller) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Check caller role is admin
        const { data: callerProfile } = await callerClient
            .from("profiles")
            .select("role")
            .eq("id", caller.id)
            .single();

        if (!callerProfile || callerProfile.role !== "admin") {
            return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Parse request body
        const { email, password, full_name, employee_code, department, role } = await req.json();

        if (!email || !password || !full_name || !employee_code) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Create user with service_role key (won't affect caller's session)
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm
            user_metadata: { full_name, employee_code },
        });

        if (createError) {
            return new Response(JSON.stringify({ error: createError.message }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 4. Create profile
        const { error: profileError } = await adminClient
            .from("profiles")
            .upsert({
                id: newUser.user.id,
                full_name,
                email,
                employee_code,
                department: department || null,
                role: role || "member",
                status: "active",
            });

        if (profileError) {
            // Rollback: delete auth user if profile creation fails
            await adminClient.auth.admin.deleteUser(newUser.user.id);
            return new Response(JSON.stringify({ error: `Profile error: ${profileError.message}` }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({
            success: true,
            user: {
                id: newUser.user.id,
                email,
                full_name,
                employee_code,
                department,
                role: role || "member",
                status: "active",
            },
        }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
