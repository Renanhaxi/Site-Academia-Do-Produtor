import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://mcabymkxorqcbijvdfvp.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OjDhrZqqFIP0_UgojaPBdg_EgK-zr2r';

export const supabase = createClient(supabaseUrl, supabaseKey);
