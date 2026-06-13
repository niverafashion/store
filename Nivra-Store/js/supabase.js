import { createClient } from 
'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'


const supabaseUrl = "https://xeovbfxqwqpemsqfapne.supabase.co"

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlb3ZiZnhxd3FwZW1zcWZhcG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjM0NTIsImV4cCI6MjA5NjgzOTQ1Mn0.stK3Kj7gYLB8_USH4LASry0qhLh05UVYQ9AF2NU3iFk"


export const supabase =
createClient(
supabaseUrl,
supabaseKey
)