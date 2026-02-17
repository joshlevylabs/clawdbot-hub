#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Use postgres REST API to execute SQL
async function createTables() {
  // Read env vars from .env.local manually
  const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  const supabaseUrl = envFile.match(/NEXT_PUBLIC_PAPER_SUPABASE_URL=(.+)/)?.[1];
  const serviceKey = envFile.match(/PAPER_SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];
  
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }
  
  // Read the SQL file
  const sqlPath = path.join(__dirname, 'create-supabase-tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Executing ${statements.length} SQL statements...`);
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n${i + 1}. ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`);
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: statement + ';' })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`   ❌ Error: ${error}`);
        // Try a different approach for table creation
        if (statement.includes('CREATE TABLE')) {
          console.log('   Trying direct table creation...');
          // We'll handle this manually for now
        }
      } else {
        console.log('   ✅ Success');
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${err.message}`);
    }
  }
  
  console.log('\nDone! Verifying table creation...');
  
  // Verify by trying to insert test data
  const testVertical = {
    key: 'test-vertical',
    name: 'Test Vertical',
    emoji: '🔧',
    description: 'Test vertical for verification',
    color: 'blue',
    repos: ['~/test'],
    paths: ['test']
  };
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/verticals`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testVertical)
    });
    
    if (response.ok) {
      console.log('✅ Tables created successfully!');
      
      // Clean up test data
      await fetch(`${supabaseUrl}/rest/v1/verticals?key=eq.test-vertical`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });
    } else {
      const error = await response.text();
      console.log('❌ Table verification failed:', error);
      console.log('Tables may need to be created manually in Supabase dashboard');
    }
  } catch (err) {
    console.error('❌ Verification error:', err.message);
  }
}

createTables().catch(console.error);