"""
Script to create projects from PDF data
Extracts project info and creates them in the CRM via API
"""

import requests
from datetime import datetime

# API Configuration
API_BASE_URL = "https://team-crm-software-production.up.railway.app/api/v1"
# You'll need to get your auth token from the browser after logging in

# Projects extracted from PDF
projects_data = [
    {
        "name": "Shade Matching",
        "start_date": "01/08/2024",
        "end_date": "31/07/2026",
        "description": "Shade matching project with team members: Ehsan, Yusma, Junaid"
    },
    {
        "name": "Metal Positioning",
        "start_date": "01/08/2024",
        "end_date": "31/08/2027",
        "description": "Metal positioning project with team members: Ehsan, Javed"
    },
    {
        "name": "FNIRS + EEG + ECG",
        "start_date": "30/12/2022",
        "end_date": "29/06/2026",
        "description": "FNIRS + EEG + ECG project. Meeting Schedule: Tuesday 3:00 PM to 4:00 PM. Team: Devender (Lead EEG), Ehsan, Nivit, Dhwani (Lead FNIRS), Kaunain, Sadan"
    },
    {
        "name": "SEISMOMETER",
        "start_date": "07/07/2025",
        "end_date": "06/01/2027",
        "description": "Seismometer project. Meeting Schedule: Wednesday 3:00 PM to 4:00 PM. Team: Devender, Ehsan (LEAD), Iqbal, Idrish"
    },
    {
        "name": "DRDE - ESLI",
        "start_date": "17/07/2025",
        "end_date": "16/07/2028",
        "description": "DRDE - ESLI project. Meeting Schedule: Thursday 3:00 PM to 4:00 PM. Team: Devender, Ehsan, Abdullah (LEAD), Kaunain (LEAD), Shaifali"
    },
    {
        "name": "UPS - Texmib",
        "start_date": "11/03/2025",
        "end_date": "10/03/2026",
        "description": "UPS - Texmib project. Meeting Schedule: Friday 3:00 PM to 4:00 PM. Team: Devender (LEAD), Ashokji, Mudra, Kaunain"
    },
    {
        "name": "AIIMS UCL (Camera)",
        "start_date": "04/08/2025",
        "end_date": "03/08/2026",
        "description": "AIIMS UCL (Camera) project. Meeting Schedule: Friday 3:00 PM to 4:00 PM"
    }
]

# Projects without complete dates (skipped)
skipped_projects = [
    "Broken File Retrieval - No dates",
    "OPD Assistive Dental Device - No dates",
    "M.Tech Discussion - No dates"
]


def convert_date(date_str):
    """Convert DD/MM/YYYY to YYYY-MM-DD format"""
    if not date_str:
        return None
    dt = datetime.strptime(date_str, "%d/%m/%Y")
    return dt.strftime("%Y-%m-%d")


def create_projects(auth_token):
    """Create projects via API"""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

    created = []
    failed = []

    print("=" * 70)
    print("CREATING PROJECTS FROM PDF")
    print("=" * 70)
    print()

    for idx, project_data in enumerate(projects_data, 1):
        project_payload = {
            "name": project_data["name"],
            "description": project_data["description"],
            "start_date": convert_date(project_data["start_date"]),
            "end_date": convert_date(project_data["end_date"])
        }

        print(f"[{idx}/{len(projects_data)}] Creating: {project_data['name']}")
        print(f"  Start: {project_data['start_date']} → {project_payload['start_date']}")
        print(f"  End: {project_data['end_date']} → {project_payload['end_date']}")

        try:
            response = requests.post(
                f"{API_BASE_URL}/projects/",
                json=project_payload,
                headers=headers
            )

            if response.status_code == 201:
                result = response.json()
                created.append(project_data["name"])
                print(f"  ✓ SUCCESS - Project ID: {result['id']}")
            else:
                failed.append({
                    "name": project_data["name"],
                    "error": response.json().get("detail", response.text)
                })
                print(f"  ✗ FAILED - {response.status_code}: {response.json().get('detail', response.text)}")

        except Exception as e:
            failed.append({
                "name": project_data["name"],
                "error": str(e)
            })
            print(f"  ✗ ERROR - {str(e)}")

        print()

    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"✓ Successfully created: {len(created)}/{len(projects_data)}")
    if created:
        for name in created:
            print(f"  - {name}")

    if failed:
        print(f"\n✗ Failed: {len(failed)}")
        for item in failed:
            print(f"  - {item['name']}: {item['error']}")

    if skipped_projects:
        print(f"\n⊘ Skipped (no dates): {len(skipped_projects)}")
        for name in skipped_projects:
            print(f"  - {name}")

    print()
    print("=" * 70)


def main():
    print()
    print("PROJECT IMPORT TOOL")
    print("=" * 70)
    print(f"Found {len(projects_data)} projects with complete dates")
    print(f"Skipping {len(skipped_projects)} projects without dates")
    print()
    print("Projects to be created:")
    for idx, p in enumerate(projects_data, 1):
        print(f"{idx}. {p['name']} ({p['start_date']} to {p['end_date']})")
    print()
    print("=" * 70)
    print()

    # Get auth token
    print("To get your auth token:")
    print("1. Open your browser and log into the CRM")
    print("2. Open Developer Tools (F12)")
    print("3. Go to Application > Local Storage")
    print("4. Find 'auth-storage' and copy the 'access_token' value")
    print()

    auth_token = input("Paste your auth token here: ").strip()

    if not auth_token:
        print("Error: No token provided!")
        return

    print()
    confirm = input("Ready to create projects? (yes/no): ").strip().lower()

    if confirm == "yes":
        create_projects(auth_token)
    else:
        print("Cancelled.")


if __name__ == "__main__":
    main()
