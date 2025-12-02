import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = 'https://evzmidgljjuvhdvrpqgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2em1pZGdsamp1dmhkdnJwcWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODkwMTMsImV4cCI6MjA4MDA2NTAxM30.XyETGG2wKr0lbDbd94UKk0oVQsDlzxCN2fg635X7uk4';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
