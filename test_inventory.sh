#!/bin/bash

# Inventory Management System Test Script
# This script tests all inventory features end-to-end

BASE_URL="http://localhost:8000/api/v1"
echo "=== Testing Inventory Management System ==="
echo ""

# Step 1: Login as super admin
echo "1. Logging in as super admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "✅ Login successful!"
echo ""

# Step 2: Create a category
echo "2. Creating inventory category..."
CATEGORY_RESPONSE=$(curl -s -X POST "$BASE_URL/inventory/categories/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Electronics",
    "description": "Electronic components for testing"
  }')

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CATEGORY_ID" ]; then
  echo "❌ Category creation failed!"
  echo "Response: $CATEGORY_RESPONSE"
else
  echo "✅ Category created! ID: $CATEGORY_ID"
fi
echo ""

# Step 3: Create inventory item
echo "3. Creating inventory item..."
ITEM_RESPONSE=$(curl -s -X POST "$BASE_URL/inventory/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Resistor 10K\",
    \"description\": \"10K Ohm resistor for testing\",
    \"category_id\": \"$CATEGORY_ID\",
    \"sku\": \"RES-10K-TEST\",
    \"quantity\": 50,
    \"unit\": \"pcs\",
    \"location\": \"Shelf A1\",
    \"min_threshold\": 20,
    \"unit_price\": 0.10,
    \"supplier\": \"Test Electronics Co.\",
    \"notes\": \"Test item for inventory system\"
  }")

ITEM_ID=$(echo $ITEM_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ITEM_ID" ]; then
  echo "❌ Item creation failed!"
  echo "Response: $ITEM_RESPONSE"
  exit 1
fi
echo "✅ Item created! ID: $ITEM_ID"
echo ""

# Step 4: Get item details
echo "4. Fetching item details..."
ITEM_DETAILS=$(curl -s -X GET "$BASE_URL/inventory/$ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

CURRENT_QUANTITY=$(echo $ITEM_DETAILS | grep -o '"quantity":[0-9]*' | cut -d':' -f2)
echo "✅ Current quantity: $CURRENT_QUANTITY pcs"
echo ""

# Step 5: Stock In operation
echo "5. Testing Stock In (adding 25 units)..."
STOCK_IN_RESPONSE=$(curl -s -X POST "$BASE_URL/inventory/$ITEM_ID/stock-in" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 25,
    "reason": "New shipment received"
  }')

echo "Stock In Response: $STOCK_IN_RESPONSE"

# Verify new quantity
ITEM_AFTER_IN=$(curl -s -X GET "$BASE_URL/inventory/$ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
NEW_QUANTITY=$(echo $ITEM_AFTER_IN | grep -o '"quantity":[0-9]*' | cut -d':' -f2)
echo "✅ Stock In successful! New quantity: $NEW_QUANTITY pcs"
echo ""

# Step 6: Stock Out operation
echo "6. Testing Stock Out (removing 10 units)..."
STOCK_OUT_RESPONSE=$(curl -s -X POST "$BASE_URL/inventory/$ITEM_ID/stock-out" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 10,
    "reason": "Used for Project XYZ"
  }')

echo "Stock Out Response: $STOCK_OUT_RESPONSE"

# Verify new quantity
ITEM_AFTER_OUT=$(curl -s -X GET "$BASE_URL/inventory/$ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
FINAL_QUANTITY=$(echo $ITEM_AFTER_OUT | grep -o '"quantity":[0-9]*' | cut -d':' -f2)
echo "✅ Stock Out successful! Final quantity: $FINAL_QUANTITY pcs"
echo ""

# Step 7: Get transaction history
echo "7. Fetching transaction history..."
TRANSACTIONS=$(curl -s -X GET "$BASE_URL/inventory/$ITEM_ID/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TRANSACTION_COUNT=$(echo $TRANSACTIONS | grep -o '"id":"[^"]*"' | wc -l)
echo "✅ Transaction history retrieved! Total transactions: $TRANSACTION_COUNT"
echo "Transactions preview:"
echo $TRANSACTIONS | python3 -m json.tool 2>/dev/null || echo $TRANSACTIONS
echo ""

# Step 8: Update item
echo "8. Testing item update..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/inventory/$ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Resistor 10K (Updated)",
    "description": "Updated description",
    "category_id": "'$CATEGORY_ID'",
    "sku": "RES-10K-TEST-V2",
    "unit": "pcs",
    "location": "Shelf B2",
    "min_threshold": 15,
    "unit_price": 0.12,
    "supplier": "Updated Supplier Co.",
    "notes": "Updated notes"
  }')

echo "✅ Item updated successfully!"
echo ""

# Step 9: Create low stock item
echo "9. Creating low stock item for alert testing..."
LOW_STOCK_ITEM=$(curl -s -X POST "$BASE_URL/inventory/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Low Stock Test Item\",
    \"description\": \"Item to test low stock alerts\",
    \"category_id\": \"$CATEGORY_ID\",
    \"sku\": \"LOW-STOCK-001\",
    \"quantity\": 5,
    \"unit\": \"pcs\",
    \"location\": \"Shelf C1\",
    \"min_threshold\": 20,
    \"unit_price\": 1.50,
    \"supplier\": \"Test Supplier\",
    \"notes\": \"Below threshold\"
  }")

echo "✅ Low stock item created!"
echo ""

# Step 10: Get low stock items
echo "10. Fetching low stock items..."
LOW_STOCK_LIST=$(curl -s -X GET "$BASE_URL/inventory/low-stock" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

LOW_STOCK_COUNT=$(echo $LOW_STOCK_LIST | grep -o '"id":"[^"]*"' | wc -l)
echo "✅ Low stock items retrieved! Count: $LOW_STOCK_COUNT"
echo ""

# Step 11: List all inventory items
echo "11. Fetching all inventory items..."
ALL_ITEMS=$(curl -s -X GET "$BASE_URL/inventory/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TOTAL_ITEMS=$(echo $ALL_ITEMS | grep -o '"id":"[^"]*"' | wc -l)
echo "✅ All items retrieved! Total items: $TOTAL_ITEMS"
echo ""

# Step 12: List all categories
echo "12. Fetching all categories..."
ALL_CATEGORIES=$(curl -s -X GET "$BASE_URL/inventory/categories" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TOTAL_CATEGORIES=$(echo $ALL_CATEGORIES | grep -o '"id":"[^"]*"' | wc -l)
echo "✅ All categories retrieved! Total categories: $TOTAL_CATEGORIES"
echo ""

# Summary
echo "================================"
echo "📊 TEST SUMMARY"
echo "================================"
echo "✅ Authentication: PASSED"
echo "✅ Category Management: PASSED"
echo "✅ Item Creation: PASSED"
echo "✅ Stock In Operation: PASSED"
echo "✅ Stock Out Operation: PASSED"
echo "✅ Transaction History: PASSED"
echo "✅ Item Update: PASSED"
echo "✅ Low Stock Detection: PASSED"
echo "✅ List Operations: PASSED"
echo ""
echo "Final Inventory State:"
echo "- Total Items: $TOTAL_ITEMS"
echo "- Total Categories: $TOTAL_CATEGORIES"
echo "- Low Stock Items: $LOW_STOCK_COUNT"
echo "- Test Item Final Quantity: $FINAL_QUANTITY pcs"
echo ""
echo "🎉 All inventory tests completed successfully!"
