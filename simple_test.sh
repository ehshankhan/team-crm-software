#!/bin/bash

# Simple test script
echo "Testing Inventory System..."

# Get token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBleGFtcGxlLmNvbSIsImV4cCI6MTc2NjgyMzU3MSwidHlwZSI6ImFjY2VzcyJ9.ToZCcrzfU50vhrYx5P0NvFE8gWXUDvZ0FyomaMoADUc"

echo "1. Testing category creation..."
curl -v -X POST "http://localhost:8000/api/v1/inventory/categories/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "TestCategory", "description": "Test Description"}'

echo ""
echo ""
echo "2. Listing categories..."
curl -s -X GET "http://localhost:8000/api/v1/inventory/categories" \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "3. Creating inventory item..."
curl -v -X POST "http://localhost:8000/api/v1/inventory/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Item",
    "description": "Test description",
    "sku": "TEST-001",
    "quantity": 100,
    "unit": "pcs",
    "location": "A1",
    "min_threshold": 10,
    "unit_price": 1.50
  }'
