import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qzgphlnfvvrzllpipnlv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6Z3BobG5mdnZyemxscGlwbmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjkzNjksImV4cCI6MjA2NjQ0NTM2OX0.HOpM1_yPf2_oNLuMAyxOWi7SI4NBgvCjP44GDeyylZo'

export const supabase = createClient(supabaseUrl, supabaseKey)