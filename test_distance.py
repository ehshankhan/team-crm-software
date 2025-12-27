#!/usr/bin/env python3
from math import radians, cos, sin, asin, sqrt

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance between two GPS points"""
    R = 6371000  # Earth's radius in meters

    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))

    return R * c

# Office location
office_lat = 28.544396761789827
office_lon = 77.19271651688473

# Test 1: Same location (should be 0 meters)
print("Test 1: Exact same location")
dist1 = haversine(office_lat, office_lon, office_lat, office_lon)
print(f"Distance: {dist1:.2f} meters")
print(f"Within 200m? {dist1 <= 200}")
print()

# Test 2: Slightly different (should be very close)
print("Test 2: Location from test script")
test_lat = 28.545
test_lon = 77.193
dist2 = haversine(office_lat, office_lon, test_lat, test_lon)
print(f"Distance: {dist2:.2f} meters")
print(f"Within 200m? {dist2 <= 200}")
print()

# Test 3: Old location (should be far)
print("Test 3: Old location (should be far)")
old_lat = 28.6139
old_lon = 77.2090
dist3 = haversine(office_lat, office_lon, old_lat, old_lon)
print(f"Distance: {dist3:.2f} meters")
print(f"Within 200m? {dist3 <= 200}")
