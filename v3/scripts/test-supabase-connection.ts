import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Please provide NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY via environment variables or .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing Supabase connection...');
  
  // 1. Test ping / select
  const { data: groups, error: groupsErr } = await supabase.from('report_groups').select('*').limit(1);
  if (groupsErr) {
    console.error('Error fetching groups:', groupsErr);
    process.exit(1);
  }
  console.log('Successfully connected to report_groups table. Count:', groups?.length);

  const { data: versions, error: versionsErr } = await supabase.from('report_versions').select('*').limit(1);
  if (versionsErr) {
    console.error('Error fetching versions:', versionsErr);
    process.exit(1);
  }
  console.log('Successfully connected to report_versions table. Count:', versions?.length);

  console.log('Supabase connection verified successfully!');
}

run();
