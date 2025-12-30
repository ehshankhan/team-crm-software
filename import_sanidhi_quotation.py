import pandas as pd
import requests
import sys

# Configuration
API_BASE_URL = "https://team-crm-software-production.up.railway.app/api/v1"
EXCEL_FILE = "Sannidhi_Quotation.xlsx"

# Read credentials
print("Please enter your login credentials:")
email = input("Email: ")
password = input("Password: ")

# Login to get token
print("\nLogging in...")
login_response = requests.post(
    f"{API_BASE_URL}/auth/login",
    json={"email": email, "password": password}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    sys.exit(1)

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("Login successful!")

# Read Excel file
print("\nReading Excel file...")
# Read data starting from row 10 (data rows), row 9 has headers but pandas doesn't read them well
df = pd.read_excel(EXCEL_FILE, header=None, skiprows=10)

# Remove the last 3 rows (subtotal, GST, total)
df = df[:-3]

# Manually assign column names
df.columns = ['Sr_No', 'Description', 'Quantity', 'Unit_Price', 'Total_Price']

# Remove rows with NaN in Description
df = df.dropna(subset=['Description'])

# Convert numeric columns
df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce').fillna(1).astype(int)
df['Unit_Price'] = pd.to_numeric(df['Unit_Price'], errors='coerce').fillna(0)

print(f"Found {len(df)} items in the Excel file")

# Create or get category
print("\nCreating/Getting 'Electronic Components' category...")
category_name = "Electronic Components"

# Get existing categories
categories_response = requests.get(f"{API_BASE_URL}/inventory/categories", headers=headers)
categories = categories_response.json()

# Find or create category
category_id = None
for cat in categories:
    if cat['name'] == category_name:
        category_id = cat['id']
        print(f"Found existing category: {category_name}")
        break

if not category_id:
    # Create new category
    create_cat_response = requests.post(
        f"{API_BASE_URL}/inventory/categories",
        headers=headers,
        json={"name": category_name, "description": "Electronic components from Sannidhi quotation"}
    )
    if create_cat_response.status_code == 201:
        category_id = create_cat_response.json()['id']
        print(f"Created new category: {category_name}")
    else:
        print(f"Failed to create category: {create_cat_response.text}")
        sys.exit(1)

# Import items
print(f"\nImporting {len(df)} items to inventory...")
success_count = 0
error_count = 0

for idx, row in df.iterrows():
    item_name = str(row['Description']).strip()
    quantity = int(row['Quantity'])
    unit_price = float(row['Unit_Price'])

    # Create inventory item
    item_data = {
        "name": item_name,
        "category_id": category_id,
        "quantity": quantity,
        "unit": "pcs",
        "min_threshold": max(5, int(quantity * 0.1)),  # 10% of quantity or 5, whichever is higher
        "notes": f"Unit Price: ₹{unit_price} | From Sannidhi Quotation"
    }

    response = requests.post(
        f"{API_BASE_URL}/inventory/",
        headers=headers,
        json=item_data
    )

    if response.status_code == 201:
        success_count += 1
        print(f"[OK] Added: {item_name} (Qty: {quantity})")
    else:
        error_count += 1
        print(f"[FAIL] {item_name} - {response.text}")

print(f"\n{'='*60}")
print(f"Import Complete!")
print(f"Successfully imported: {success_count} items")
print(f"Errors: {error_count} items")
print(f"{'='*60}")
