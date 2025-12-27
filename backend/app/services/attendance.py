from math import radians, cos, sin, asin, sqrt
from app.config import settings


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance in meters between two GPS points using the Haversine formula.

    Args:
        lat1: Latitude of first point
        lon1: Longitude of first point
        lat2: Latitude of second point
        lon2: Longitude of second point

    Returns:
        Distance in meters between the two points
    """
    R = 6371000  # Earth's radius in meters

    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))

    return R * c


def validate_location(lat: float, lon: float) -> bool:
    """
    Check if user is within the allowed radius of the lab location.

    Args:
        lat: User's latitude
        lon: User's longitude

    Returns:
        True if user is within allowed radius of lab, False otherwise
    """
    distance = haversine(lat, lon, settings.LAB_LATITUDE, settings.LAB_LONGITUDE)
    return distance <= settings.LAB_RADIUS_METERS
