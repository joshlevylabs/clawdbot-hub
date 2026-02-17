#!/bin/bash
set -e

cd "$(dirname "$0")/.."
source .env.local

echo "🔧 Creating Supabase tables manually..."

# Since Supabase REST API doesn't allow DDL, we'll need to use the dashboard
# For now, let's create a simple seeding approach assuming tables exist
echo "Tables need to be created manually in Supabase dashboard:"
echo
echo "1. Go to: https://supabase.com/dashboard/project/atldnpjaxaeqzgtqbrpy/editor"
echo "2. Run the SQL in scripts/create-supabase-tables.sql"
echo
echo "Or run this with psql:"
echo "export PGPASSWORD='<password>'"
echo "psql -h db.atldnpjaxaeqzgtqbrpy.supabase.co -U postgres -d postgres -f scripts/create-supabase-tables.sql"
echo

# Test if tables exist by trying to read them
echo "Testing table existence..."

test_table() {
  local table=$1
  echo -n "Checking $table... "
  
  response=$(curl -s -w "%{http_code}" -o /tmp/test_response.json \
    "$NEXT_PUBLIC_PAPER_SUPABASE_URL/rest/v1/$table?limit=0" \
    -H "apikey: $PAPER_SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $PAPER_SUPABASE_SERVICE_ROLE_KEY")
  
  if [ "$response" = "200" ]; then
    echo "✅ EXISTS"
    return 0
  else
    echo "❌ NOT FOUND ($(cat /tmp/test_response.json))"
    return 1
  fi
}

# Test all three tables
test_table "verticals" || echo "  → Need to create verticals table"
test_table "initiatives" || echo "  → Need to create initiatives table"
test_table "standup_schedules" || echo "  → Need to create standup_schedules table"

echo
echo "If tables don't exist, please create them manually using the Supabase dashboard."