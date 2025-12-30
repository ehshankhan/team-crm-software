# -*- coding: utf-8 -*-
import pandas as pd
import re

def categorize(name):
    n = name.lower()
    if any(x in n for x in ['raspberry', 'arduino', 'esp32', 'teensy', 'atmega328']):
        return 'Development Boards'
    elif any(x in n for x in ['resistor', ' ohm']):
        return 'Passive Components - Resistors'
    elif any(x in n for x in ['capacitor', ' uf', ' pf']):
        return 'Passive Components - Capacitors'
    elif 'mosfet' in n:
        return 'Active Components - MOSFETs'
    elif any(x in n for x in ['transistor', 'darlington', 'tip122']):
        return 'Active Components - Transistors'
    elif any(x in n for x in ['diode', 'photodiode']):
        return 'Active Components - Diodes'
    elif any(x in n for x in ['lm358', 'op-amp', 'tl071']):
        return 'ICs - Operational Amplifiers'
    elif any(x in n for x in ['cd4017', 'cd4051', 'cd40106', '74hc', 'mux', 'counter']):
        return 'ICs - Logic ICs'
    elif any(x in n for x in ['voltage regulator', 'lm334', 'lm234', 'ldo', 'az1084']):
        return 'ICs - Voltage Regulators'
    elif any(x in n for x in ['ad9833', 'max4659', 'max4594']):
        return 'ICs - Special Function'
    elif 'relay' in n or 'ssr-' in n:
        return 'Modules - Relays & Switches'
    elif 'servo' in n or 'motor' in n:
        return 'Modules - Motor Control'
    elif any(x in n for x in ['connector', 'terminal', 'jst', 'dupont']):
        return 'Connectors & Terminals'
    elif any(x in n for x in ['wire', 'cable', 'awg']):
        return 'Cables & Wires'
    elif 'optocoupler' in n or 'pc817' in n:
        return 'Passive Components - Optocouplers'
    elif 'power supply' in n or 'adapter' in n:
        return 'Power Supplies & Adapters'
    elif 'heat sink' in n or 'heatsink' in n:
        return 'Cooling & Thermal'
    else:
        return 'Uncategorized'

def get_supplier(name, vendor=''):
    combined = (name + ' ' + vendor).lower()
    if 'robu' in combined:
        return 'Robu'
    elif 'navrang' in combined:
        return 'Navrang Electronics'
    elif 'element' in combined:
        return 'Element14'
    elif 'mouser' in combined:
        return 'Mouser'
    elif 'digikey' in combined:
        return 'Digikey'
    elif 'amazon' in combined:
        return 'Amazon'
    return 'Unknown'

def get_min_stock(category, qty):
    if 'Resistor' in category or 'Capacitor' in category:
        return max(10, int(qty * 0.2))
    elif 'Development Board' in category:
        return max(1, int(qty * 0.1))
    elif 'IC' in category:
        return max(5, int(qty * 0.15))
    return max(2, int(qty * 0.1))

print('Processing Robu orders...')
df_robu = pd.read_excel('robu_orders.xlsx')
robu_items = []
for _, row in df_robu.iterrows():
    robu_items.append({
        'category': categorize(row['Product Name']),
        'name': row['Product Name'][:100],
        'quantity': int(row['Quantity']),
        'unit_price': None,
        'supplier': 'Robu',
        'min_stock_level': get_min_stock(categorize(row['Product Name']), int(row['Quantity'])),
        'location': '',
        'notes': f"Order {row['Order Number']}"
    })

print(f'Processed {len(robu_items)} Robu items')

print('Processing components inventory...')
df_comp = pd.read_excel('components_inventory.xlsx')
comp_items = []
for _, row in df_comp.iterrows():
    price = None
    if pd.notna(row['Unit Price']):
        try:
            price = float(str(row['Unit Price']).replace('/-', '').replace(',', ''))
        except:
            pass

    comp_items.append({
        'category': categorize(row['Component Name']),
        'name': row['Component Name'],
        'quantity': int(row['Quantity']),
        'unit_price': price,
        'supplier': get_supplier(row['Component Name'], str(row['Vendor/Notes'])),
        'min_stock_level': get_min_stock(categorize(row['Component Name']), int(row['Quantity'])),
        'location': '',
        'notes': str(row['Vendor/Notes']) if pd.notna(row['Vendor/Notes']) else ''
    })

print(f'Processed {len(comp_items)} component items')

all_items = robu_items + comp_items
df_final = pd.DataFrame(all_items)

print('\\n===== SUMMARY =====')
print(f'Total items: {len(df_final)}')
print(f'Items with pricing: {df_final["unit_price"].notna().sum()}')
print('\\nItems by category:')
print(df_final['category'].value_counts())

print('\\nExporting to CSV...')
df_final.to_csv('cleaned_inventory.csv', index=False, encoding='utf-8')
print('Done! Saved to cleaned_inventory.csv')
