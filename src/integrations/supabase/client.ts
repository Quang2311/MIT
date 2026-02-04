import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Only throw if in browser context to avoid build crashes if env vars are missing during CI
if (typeof window !== "undefined" && (!supabaseUrl || !supabaseKey)) {
    console.warn("Missing Supabase Environment Variables");
}

export const supabase = createClient<Database>(
    supabaseUrl || "",
    supabaseKey || "",
    {
        auth: {
            storage: localStorage,
            persistSession: true,
            autoRefreshToken: true,
        },
    }
);
