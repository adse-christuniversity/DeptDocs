import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase environment variables are missing. Please check your .env.local file.');
        // Return a dummy client that throws helpful errors if used
        return {
            auth: {
                signUp: () => Promise.reject(new Error("Supabase is not configured. Check your environment variables.")),
                signInWithPassword: () => Promise.reject(new Error("Supabase is not configured.")),
            }
        } as any;
    }

    return createBrowserClient(supabaseUrl, supabaseKey);
}
