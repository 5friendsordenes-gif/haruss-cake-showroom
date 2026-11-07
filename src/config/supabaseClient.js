import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaoxlsdofmelgcljpbbu.supabase.co';
const supabaseAnonKey = 'sb_publishable_wDNETbsLnJ4rU4F3iiYBmQ_TE0G5-PH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
