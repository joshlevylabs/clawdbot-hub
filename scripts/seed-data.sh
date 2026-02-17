#!/bin/bash
set -e

cd "$(dirname "$0")/.."
source .env.local

echo "🌱 Seeding data to Supabase..."

# Helper function to make API calls
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  curl -s -X "$method" \
    "$NEXT_PUBLIC_PAPER_SUPABASE_URL/rest/v1/$endpoint" \
    -H "apikey: $PAPER_SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $PAPER_SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates,return=representation" \
    ${data:+-d "$data"}
}

# Function to seed verticals from JSON
seed_verticals() {
  echo "📁 Seeding verticals..."
  
  # Read the JSON file and extract verticals
  if [ ! -f "public/data/verticals.json" ]; then
    echo "❌ verticals.json not found"
    return 1
  fi
  
  # Extract each vertical and POST to API
  cat public/data/verticals.json | jq -c '.verticals[]' | while read -r vertical; do
    key=$(echo "$vertical" | jq -r '.key')
    echo "  Seeding vertical: $key"
    
    response=$(api_call "POST" "verticals" "$vertical")
    if echo "$response" | jq -e '.key' >/dev/null 2>&1; then
      echo "  ✅ Created: $key"
    else
      echo "  ❌ Failed: $key - $response"
    fi
  done
}

# Function to seed initiatives from JSON
seed_initiatives() {
  echo "🎯 Seeding initiatives..."
  
  if [ ! -f "public/data/initiatives.json" ]; then
    echo "❌ initiatives.json not found"
    return 1
  fi
  
  cat public/data/initiatives.json | jq -c '.initiatives[]' | while read -r initiative; do
    key=$(echo "$initiative" | jq -r '.key')
    echo "  Seeding initiative: $key"
    
    response=$(api_call "POST" "initiatives" "$initiative")
    if echo "$response" | jq -e '.key' >/dev/null 2>&1; then
      echo "  ✅ Created: $key"
    else
      echo "  ❌ Failed: $key - $response"
    fi
  done
}

# Function to seed standup schedules from JSON
seed_schedules() {
  echo "📅 Seeding standup schedules..."
  
  if [ ! -f "public/data/standups/schedule.json" ]; then
    echo "❌ schedule.json not found"
    return 1
  fi
  
  cat public/data/standups/schedule.json | jq -c '.types[]' | while read -r schedule; do
    key=$(echo "$schedule" | jq -r '.key')
    echo "  Seeding schedule: $key"
    
    response=$(api_call "POST" "standup_schedules" "$schedule")
    if echo "$response" | jq -e '.key' >/dev/null 2>&1; then
      echo "  ✅ Created: $key"
    else
      echo "  ❌ Failed: $key - $response"
    fi
  done
}

# Test if our APIs work first
echo "🧪 Testing API endpoints..."

test_api() {
  local endpoint=$1
  echo -n "Testing $endpoint... "
  
  response=$(api_call "GET" "$endpoint")
  if echo "$response" | jq -e '.tableExists' >/dev/null 2>&1; then
    if echo "$response" | jq -r '.tableExists' | grep -q "true"; then
      echo "✅ Ready"
      return 0
    else
      echo "❌ Table missing"
      return 1
    fi
  else
    echo "❌ API error: $response"
    return 1
  fi
}

# Test all endpoints
all_good=true
test_api "verticals" || all_good=false
test_api "initiatives" || all_good=false  
test_api "standup_schedules" || all_good=false

if [ "$all_good" = false ]; then
  echo
  echo "❌ Some tables are missing. Please create them manually:"
  echo "1. Go to: https://supabase.com/dashboard/project/atldnpjaxaeqzgtqbrpy/editor"
  echo "2. Run the SQL in scripts/create-supabase-tables.sql"
  echo
  exit 1
fi

echo
echo "✅ All APIs ready. Starting seed..."

# Seed all data
seed_verticals
seed_initiatives  
seed_schedules

echo
echo "🎉 Seeding complete!"