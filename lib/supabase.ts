import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured =
  !!(url && anonKey && url !== 'your_supabase_url_here' && anonKey !== 'your_supabase_anon_key_here')

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  if (!browserClient) {
    // createBrowserClient stores PKCE verifier in cookies so server-side
    // route handlers can complete the code exchange
    browserClient = createBrowserClient(url!, anonKey!)
  }
  return browserClient
}

export function getSupabaseServerClient(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createClient(url!, serviceKey || anonKey!)
}
