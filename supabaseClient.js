// supabaseClient.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

export const SUPABASE_URL = "https://sapmwupwlwjrpnrkklaz.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcG13dXB3bHdqcnBucmtrbGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MjMzNzMsImV4cCI6MjA3NTA5OTM3M30.puy88odroAEvikkyozavFGWRWybPLzpUIl6ZDhutkRM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

