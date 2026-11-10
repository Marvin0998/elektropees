// Supabase-Client für den Gastzugang (/nachweise): immer anonym, ohne gespeicherte Sitzung –
// auch dann, wenn im selben Browser ein Mitarbeiter angemeldet ist. So sieht jeder exakt das, was der Gast sieht.
import { createClient } from '@supabase/supabase-js'

export function gastClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
