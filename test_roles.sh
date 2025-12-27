#!/bin/bash

echo "Testing Roles API Endpoint..."
echo ""

# Login
echo "1. Logging in..."
curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' > /tmp/login_test.json

TOKEN=$(grep -o '"access_token":"[^"]*"' /tmp/login_test.json | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Test roles endpoint
echo "2. Fetching roles from /api/v1/users/roles..."
ROLES=$(curl -s -X GET "http://localhost:8000/api/v1/users/roles" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$ROLES"
echo ""

# Count roles
ROLE_COUNT=$(echo "$ROLES" | grep -o '"id"' | wc -l)
echo "Total roles found: $ROLE_COUNT"
