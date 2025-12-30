# -*- coding: utf-8 -*-
"""
Import cleaned inventory data into CRM database
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime

# Database connection
DB_URL = "postgresql://postgres.guiioblakfaidkhgrzqh:8286860551eE@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

def create_categories(conn):
    """Create inventory categories if they don't exist"""
    categories = [
        ('Development Boards', 'Microcontroller boards and SBCs'),
        ('Passive Components - Resistors', 'Resistors of all types and values'),
        ('Passive Components - Capacitors', 'Capacitors - ceramic, electrolytic, etc'),
        ('Passive Components - Optocouplers', 'Optical isolation components'),
        ('Active Components - MOSFETs', 'MOSFET transistors'),
        ('Active Components - Transistors', 'BJT and other transistors'),
        ('Active Components - Diodes', 'Diodes, LEDs, photodiodes'),
        ('ICs - Operational Amplifiers', 'Op-amp ICs'),
        ('ICs - Microcontrollers', 'Microcontroller ICs'),
        ('ICs - Logic ICs', 'Logic gates, multiplexers, counters'),
        ('ICs - Voltage Regulators', 'Linear and switching voltage regulators'),
        ('ICs - Special Function', 'Special purpose ICs'),
        ('Modules - Sensors', 'Sensor modules'),
        ('Modules - Communication', 'WiFi, Bluetooth, RF modules'),
        ('Modules - Relays & Switches', 'Relay modules and switches'),
        ('Modules - Motor Control', 'Servo motors, motor drivers'),
        ('Connectors & Terminals', 'Connectors, headers, terminals'),
        ('Cables & Wires', 'Wires, cables, hookup wire'),
        ('Power Supplies & Adapters', 'Power supplies and adapters'),
        ('Cooling & Thermal', 'Heat sinks and thermal management'),
        ('Uncategorized', 'Items pending categorization'),
    ]

    cursor = conn.cursor()

    # Get existing categories
    cursor.execute("SELECT name FROM inventory_categories")
    existing = {row[0] for row in cursor.fetchall()}

    # Insert new categories
    new_categories = [(name, desc) for name, desc in categories if name not in existing]

    if new_categories:
        execute_values(
            cursor,
            "INSERT INTO inventory_categories (name, description) VALUES %s",
            new_categories
        )
        print(f'Created {len(new_categories)} new categories')

    conn.commit()
    cursor.close()

def get_category_mapping(conn):
    """Get category name to ID mapping"""
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM inventory_categories")
    mapping = {name: id for id, name in cursor.fetchall()}
    cursor.close()
    return mapping

def import_items(conn, csv_file):
    """Import items from CSV into database"""
    df = pd.read_excel(csv_file) if csv_file.endswith('.xlsx') else pd.read_csv(csv_file, encoding='utf-8')

    category_mapping = get_category_mapping(conn)
    cursor = conn.cursor()

    # Check existing items to avoid duplicates
    cursor.execute("SELECT LOWER(name) FROM inventory_items")
    existing_items = {row[0] for row in cursor.fetchall()}

    items_to_insert = []
    skipped = 0

    for _, row in df.iterrows():
        if row['name'].lower() in existing_items:
            skipped += 1
            continue

        category_id = category_mapping.get(row['category'])
        if not category_id:
            print(f'Warning: Category "{row["category"]}" not found, skipping item: {row["name"][:50]}')
            continue

        items_to_insert.append((
            row['name'],
            row['notes'] if pd.notna(row['notes']) else '',
            int(row['quantity']),
            int(row['min_stock_level']),
            row['supplier'] if pd.notna(row['supplier']) else 'Unknown',
            float(row['unit_price']) if pd.notna(row['unit_price']) else None,
            row['location'] if pd.notna(row['location']) else '',
            category_id
        ))

    if items_to_insert:
        execute_values(
            cursor,
            """
            INSERT INTO inventory_items
            (name, description, quantity, min_threshold, supplier, unit_price, location, category_id)
            VALUES %s
            """,
            items_to_insert
        )
        print(f'Imported {len(items_to_insert)} items')

    if skipped > 0:
        print(f'Skipped {skipped} duplicate items')

    conn.commit()
    cursor.close()

def main():
    print('Connecting to database...')

    try:
        conn = psycopg2.connect(DB_URL)
        print('Connected successfully!')

        print('\\nCreating categories...')
        create_categories(conn)

        print('\\nImporting items...')
        import_items(conn, 'cleaned_inventory.csv')

        print('\\n===== IMPORT COMPLETE =====')
        print('Check your CRM inventory page to see the imported items!')

        conn.close()

    except Exception as e:
        print(f'Error: {e}')
        raise

if __name__ == '__main__':
    main()
