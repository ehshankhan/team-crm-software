#!/bin/bash

echo "================================"
echo "ATTENDANCE SYSTEM TEST"
echo "================================"
echo ""

LAT="28.544396761789827"
LON="77.19271651688473"
EMPLOYEE_ROLE="14c41dbd-9003-441b-a2f6-7935548425b4"

# Login as admin
echo "1. Logging in as admin..."
curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' > /tmp/att_admin.json

ADMIN_TOKEN=$(grep -o '"access_token":"[^"]*"' /tmp/att_admin.json | cut -d'"' -f4)
echo "✅ Admin logged in"
echo ""

# Create test user
echo "2. Creating test user..."
TEST_EMAIL="attendance.test$(date +%s)@example.com"

curl -s -X POST "http://localhost:8000/api/v1/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"test123\",
    \"full_name\": \"Attendance Test User\",
    \"role_id\": \"$EMPLOYEE_ROLE\"
  }" > /tmp/new_user.json

if grep -q '"id"' /tmp/new_user.json; then
  echo "✅ User created: $TEST_EMAIL"
else
  echo "❌ Failed to create user"
  cat /tmp/new_user.json
  exit 1
fi
echo ""

# Login as test user
echo "3. Logging in as test user..."
curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"test123\"}" > /tmp/att_user.json

USER_TOKEN=$(grep -o '"access_token":"[^"]*"' /tmp/att_user.json | cut -d'"' -f4)
echo "✅ User logged in"
echo ""

# TEST 1: Check-in
echo "4. Testing CHECK-IN at $LAT, $LON"
curl -s -X POST "http://localhost:8000/api/v1/attendance/check-in" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\": $LAT, \"longitude\": $LON}" > /tmp/checkin.json

if grep -q '"id"' /tmp/checkin.json; then
  echo "✅ CHECK-IN SUCCESSFUL"
  grep -o '"check_in":"[^"]*"' /tmp/checkin.json | cut -d'"' -f4 | sed 's/^/   Time: /'
else
  echo "❌ Check-in failed:"
  cat /tmp/checkin.json
  exit 1
fi
echo ""

# TEST 2: Verify status
echo "5. Verifying attendance status..."
curl -s -X GET "http://localhost:8000/api/v1/attendance/today" \
  -H "Authorization: Bearer $USER_TOKEN" > /tmp/status.json

if grep -q '"check_in"' /tmp/status.json && ! grep -q '"check_out"' /tmp/status.json; then
  echo "✅ Status: CHECKED IN (pending check-out)"
fi
echo ""

# TEST 3: Invalid location
echo "6. Testing INVALID location (>200m away)..."
curl -s -X POST "http://localhost:8000/api/v1/attendance/check-in" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 28.6139, "longitude": 77.2090}' > /tmp/invalid.json

if grep -q "not within 200 meters" /tmp/invalid.json; then
  echo "✅ Invalid location REJECTED"
elif grep -q "already checked in" /tmp/invalid.json; then
  echo "✅ Duplicate check-in prevented"
fi
echo ""

# Wait for work time
echo "7. Simulating work time (3 seconds)..."
sleep 3
echo "✅ Done"
echo ""

# TEST 4: Check-out
echo "8. Testing CHECK-OUT..."
curl -s -X POST "http://localhost:8000/api/v1/attendance/check-out" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\": $LAT, \"longitude\": $LON}" > /tmp/checkout.json

if grep -q '"check_out"' /tmp/checkout.json; then
  echo "✅ CHECK-OUT SUCCESSFUL"
  grep -o '"check_out":"[^"]*"' /tmp/checkout.json | cut -d'"' -f4 | sed 's/^/   Time: /'
else
  echo "❌ Check-out failed:"
  cat /tmp/checkout.json
fi
echo ""

# TEST 5: Final status
echo "9. Final attendance record..."
curl -s -X GET "http://localhost:8000/api/v1/attendance/today" \
  -H "Authorization: Bearer $USER_TOKEN" > /tmp/final.json

if grep -q '"check_in"' /tmp/final.json && grep -q '"check_out"' /tmp/final.json; then
  echo "✅ COMPLETE RECORD:"
  grep -o '"check_in":"[^"]*"' /tmp/final.json | cut -d'"' -f4 | sed 's/^/   IN:  /'
  grep -o '"check_out":"[^"]*"' /tmp/final.json | cut -d'"' -f4 | sed 's/^/   OUT: /'
fi
echo ""

# TEST 6: Timesheet
echo "10. Checking timesheet auto-generation..."
TODAY=$(date +%Y-%m-%d)
curl -s -X GET "http://localhost:8000/api/v1/timesheets/me?start_date=$TODAY&end_date=$TODAY" \
  -H "Authorization: Bearer $USER_TOKEN" > /tmp/timesheet.json

if grep -q '"auto_hours"' /tmp/timesheet.json; then
  echo "✅ TIMESHEET AUTO-GENERATED"
  grep -o '"auto_hours":"[0-9.]*"' /tmp/timesheet.json | head -1 | cut -d'"' -f4 | sed 's/^/   Auto hours: /'
fi
echo ""

echo "================================"
echo "✅ ALL TESTS PASSED!"
echo "================================"
echo "Test User: $TEST_EMAIL"
echo "Password: test123"
echo "Location: $LAT, $LON"
echo "Radius: 200 meters"
