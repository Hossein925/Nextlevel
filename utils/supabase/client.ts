import { createBrowserClient } from "@supabase/ssr";

// Fallback credentials are provided to prevent the build from failing when
// environment variables are not set in the Vercel deployment environment.
// The user must set their own NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// in their Vercel project settings for the application to function correctly.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcmVmIiwicm9sZSI6ImFub24ifQ.your-anon-key';


export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
