import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yemldlhddckfcapyxtzb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbWxkbGhkZGNrZmNhcHl4dHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjI4MzEsImV4cCI6MjA3MDU5ODgzMX0.YN9S5c5yNsaz-ts9k81NY6M47wKXRpzNWB7EcOfwMss'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
