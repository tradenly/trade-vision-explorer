
import { createClient } from '@supabase/supabase-js';

// Using the existing environment variables from our Supabase configuration
// These are already available in the project
const supabaseUrl = "https://fkagpyfzgczcaxsqwsoi.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrYWdweWZ6Z2N6Y2F4c3F3c29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MDcxODAsImV4cCI6MjA1ODQ4MzE4MH0.hd1Os5VQkyGYLpY1bRBZ3ypy2wxdByFIzoUpk8qBRts";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
