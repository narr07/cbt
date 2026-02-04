const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ifxxdocmmzpxfymuexgk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmeHhkb2NtbXpweGZ5bXVleGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Mjg5MTAsImV4cCI6MjA4NTQwNDkxMH0.57ZqmXIk_7bfTUGIX151kkmwSNSVlqm0hirAXmdquG0');

async function checkUsers() {
  const { data, error } = await supabase.from('profiles').select('username').limit(10);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Users found in DB:', data.map(u => u.username));
  }
}

checkUsers();
