#!/usr/bin/env python3
"""
Electronics Lab Inventory Import Script
Automatically categorizes and imports inventory from Excel files
"""

import pandas as pd
import re
from datetime import datetime
from typing import Dict, List, Tuple, Optional

class InventoryImporter:
    def __init__(self):
        # Define category mapping based on keywords
        self.category_rules = {
            'Development Boards': [
                'raspberry pi', 'arduino', 'esp32', 'esp8266', 'teensy',
                'stm32', 'atmega', 'dev board', 'development board', 'nucleo'
            ],
            'Passive Components - Resistors': [
                'resistor', ' ohm', 'kohm', 'mohm', 'res thick film'
            ],
            'Passive Components - Capacitors': [
                'capacitor', 'cap ', ' f', ' uf', ' pf', ' nf', 'ceramic capacitor'
            ],
            'Active Components - MOSFETs': [
                'mosfet', 'mos fet', 'n-channel', 'p-channel'
            ],
            'Active Components - Transistors': [
                'transistor', 'bjt', 'tip122', 'bc547', 'darlington'
            ],
            'Active Components - Diodes': [
                'diode', 'photodiode', 'led', 'zener'
            ],
            'ICs - Operational Amplifiers': [
                'op-amp', 'op amp', 'lm358', 'tl071', 'operational amplifier'
            ],
            'ICs - Microcontrollers': [
                'atmega', 'pic16', 'pic18', 'microcontroller', 'mcu'
            ],
            'ICs - Logic ICs': [
                'cd4017', 'cd4051', 'cd40106', '74hc', '74ls', 'counter',
                'mux', 'multiplexer', 'schmitt trigger'
            ],
            'ICs - Voltage Regulators': [
                'voltage regulator', 'lm334', 'lm234', 'ldo', '7805', 'az1084'
            ],
            'ICs - Special Function': [
                'dds signal', 'ad9833', 'max4659', 'max4594', 'spdt', 'spst'
            ],
            'Modules - Sensors': [
                'sensor', 'gyroscope', 'accelerometer', 'temperature sensor'
            ],
            'Modules - Communication': [
                'wifi', 'bluetooth', 'rf module', 'nrf24', 'lora'
            ],
            'Modules - Relays & Switches': [
                'relay', 'solid state relay', 'ssr-'
            ],
            'Modules - Motor Control': [
                'servo', 'motor driver', 'stepper'
            ],
            'Connectors & Terminals': [
                'connector', 'terminal', 'header', 'jst', 'dupont', 'xh2.54'
            ],
            'Cables & Wires': [
                'wire', 'cable', 'awg', 'wire wrap', 'jtag', 'isp'
            ],
            'Passive Components - Optocouplers': [
                'optocoupler', 'pc817', 'opto'
            ],
            'Power Supplies & Adapters': [
                'power supply', 'adapter', 'usb type-c'
            ],
            'Cooling & Thermal': [
                'heat sink', 'heatsink', 'thermal', 'cooling'
            ],
            'Uncategorized': []  # Default category
        }

        self.items = []

    def categorize_item(self, product_name: str) -> str:
        """Auto-categorize item based on product name keywords"""
        product_lower = product_name.lower()

        for category, keywords in self.category_rules.items():
            if category == 'Uncategorized':
                continue
            for keyword in keywords:
                if keyword in product_lower:
                    return category

        return 'Uncategorized'

    def extract_specs(self, product_name: str, category: str) -> Dict[str, str]:
        """Extract specifications from product name"""
        specs = {}

        # Extract voltage ratings (e.g., "30V", "5V")
        voltage_match = re.search(r'(\d+\.?\d*)\s*V(?!\w)', product_name, re.IGNORECASE)
        if voltage_match:
            specs['voltage'] = voltage_match.group(1) + 'V'

        # Extract current ratings (e.g., "5A", "120mA")
        current_match = re.search(r'(\d+\.?\d*)\s*(A|mA)(?!\w)', product_name, re.IGNORECASE)
        if current_match:
            specs['current'] = current_match.group(1) + current_match.group(2)

        # Extract resistance (e.g., "22 Ohm", "10k")
        if 'Resistor' in category:
            ohm_match = re.search(r'(\d+\.?\d*)\s*(Ohm|ohm||kohm|mohm)', product_name, re.IGNORECASE)
            if ohm_match:
                specs['resistance'] = ohm_match.group(1) + ' ' + ohm_match.group(2)

            # Extract tolerance
            tolerance_match = re.search(r'?\s*(\d+)%', product_name)
            if tolerance_match:
                specs['tolerance'] = tolerance_match.group(1) + '%'

            # Extract power rating
            power_match = re.search(r'(\d+\.?\d*)\s*W(?!\w)', product_name, re.IGNORECASE)
            if power_match:
                specs['power'] = power_match.group(1) + 'W'

        # Extract capacitance
        if 'Capacitor' in category:
            cap_match = re.search(r'(\d+\.?\d*)\s*(F|uF|pF|nF)', product_name, re.IGNORECASE)
            if cap_match:
                specs['capacitance'] = cap_match.group(1) + ' ' + cap_match.group(2)

        # Extract package type
        package_match = re.search(r'\b(SOT-\d+|TO-\d+|PDIP-\d+|SMD|DIP|QFP|SOIC|0201|0402|0603|0805|1206)\b', product_name, re.IGNORECASE)
        if package_match:
            specs['package'] = package_match.group(1).upper()

        return specs

    def clean_product_name(self, name: str, specs: Dict[str, str]) -> str:
        """Clean and shorten product name by removing redundant specs"""
        clean_name = name

        # Remove very long descriptions in parentheses
        clean_name = re.sub(r'\([^)]{50,}\)', '', clean_name)

        # Keep only the essential part for very long names
        if len(clean_name) > 100:
            # Try to extract part number or main identifier
            parts = clean_name.split('-')
            if len(parts) > 0:
                clean_name = parts[0].strip()

        return clean_name.strip()

    def extract_part_number(self, product_name: str) -> Optional[str]:
        """Extract manufacturer part number from product name"""
        # Common patterns: ABC123-DEF, ABC123DEF, etc.
        patterns = [
            r'\b([A-Z]{2,}[\d]{3,}[A-Z\d\-]*)\b',  # e.g., IRLML6344TRPBF
            r'\b([A-Z]{2}\d{4}[A-Z]*)\b',  # e.g., CD4017BE
            r'\b(LM\s*\d{3,}[A-Z]*)\b',    # e.g., LM358
        ]

        for pattern in patterns:
            match = re.search(pattern, product_name, re.IGNORECASE)
            if match:
                return match.group(1).upper().replace(' ', '')

        return None

    def extract_supplier(self, product_name: str, vendor_notes: str = '') -> str:
        """Extract supplier from product or vendor notes"""
        combined = (product_name + ' ' + vendor_notes).lower()

        suppliers = {
            'Robu': ['robu'],
            'Amazon': ['amazon'],
            'Element14': ['element14', 'element 14'],
            'Mouser': ['mouser'],
            'Digikey': ['digikey', 'digi-key'],
            'Navrang Electronics': ['navrang'],
        }

        for supplier, keywords in suppliers.items():
            for keyword in keywords:
                if keyword in combined:
                    return supplier

        return 'Unknown'

    def process_robu_file(self, filepath: str):
        """Process Robu orders Excel file"""
        print(f"– Reading Robu orders from {filepath}...")
        df = pd.read_excel(filepath)

        for _, row in df.iterrows():
            product_name = row['Product Name']
            category = self.categorize_item(product_name)
            specs = self.extract_specs(product_name, category)
            part_number = self.extract_part_number(product_name)
            clean_name = self.clean_product_name(product_name, specs)

            item = {
                'name': clean_name,
                'original_name': product_name,
                'part_number': part_number or '',
                'category': category,
                'quantity': int(row['Quantity']),
                'unit_price': None,
                'supplier': 'Robu',
                'purchase_date': row['Order Date'] if 'Order Date' in row else None,
                'order_number': str(row['Order Number']) if 'Order Number' in row else '',
                'specifications': ', '.join([f"{k}: {v}" for k, v in specs.items()]),
                'min_stock_level': self.suggest_min_stock(category, int(row['Quantity'])),
                'location': '',
                'notes': f"Order #{row['Order Number']}" if 'Order Number' in row else ''
            }

            self.items.append(item)

        print(f" Processed {len(df)} items from Robu orders")

    def process_components_file(self, filepath: str):
        """Process general components inventory Excel file"""
        print(f"– Reading components inventory from {filepath}...")
        df = pd.read_excel(filepath)

        for _, row in df.iterrows():
            component_name = row['Component Name']
            category = self.categorize_item(component_name)
            specs = self.extract_specs(component_name, category)
            part_number = self.extract_part_number(component_name)
            supplier = self.extract_supplier(component_name, str(row['Vendor/Notes']))

            # Parse unit price
            unit_price = None
            if pd.notna(row['Unit Price']):
                price_str = str(row['Unit Price']).replace('/-', '').replace(',', '')
                try:
                    unit_price = float(price_str)
                except:
                    pass

            item = {
                'name': component_name,
                'original_name': component_name,
                'part_number': part_number or '',
                'category': category,
                'quantity': int(row['Quantity']),
                'unit_price': unit_price,
                'supplier': supplier,
                'purchase_date': row['Date'] if 'Date' in row else None,
                'order_number': '',
                'specifications': ', '.join([f"{k}: {v}" for k, v in specs.items()]),
                'min_stock_level': self.suggest_min_stock(category, int(row['Quantity'])),
                'location': '',
                'notes': str(row['Vendor/Notes']) if pd.notna(row['Vendor/Notes']) else ''
            }

            self.items.append(item)

        print(f" Processed {len(df)} items from components inventory")

    def suggest_min_stock(self, category: str, current_qty: int) -> int:
        """Suggest minimum stock level based on category and current quantity"""
        if 'Resistor' in category or 'Capacitor' in category:
            return max(10, int(current_qty * 0.2))  # 20% of current stock, min 10
        elif 'Development Board' in category:
            return max(1, int(current_qty * 0.1))  # 10% of current stock, min 1
        elif 'IC' in category or 'Component' in category:
            return max(5, int(current_qty * 0.15))  # 15% of current stock, min 5
        else:
            return max(2, int(current_qty * 0.1))  # 10% of current stock, min 2

    def remove_duplicates(self):
        """Identify and merge potential duplicates"""
        print(" Checking for duplicates...")

        # Group by part number or similar names
        unique_items = {}
        duplicates_merged = 0

        for item in self.items:
            key = item['part_number'] if item['part_number'] else item['name']
            key = key.lower().strip()

            if key in unique_items:
                # Merge quantities
                unique_items[key]['quantity'] += item['quantity']
                # Keep the one with price if available
                if item['unit_price'] and not unique_items[key]['unit_price']:
                    unique_items[key]['unit_price'] = item['unit_price']
                duplicates_merged += 1
            else:
                unique_items[key] = item

        self.items = list(unique_items.values())

        if duplicates_merged > 0:
            print(f" Merged {duplicates_merged} duplicate items")
        else:
            print(" No duplicates found")

    def generate_report(self):
        """Generate summary report"""
        print("\n" + "="*60)
        print("Š INVENTORY IMPORT SUMMARY")
        print("="*60)

        df = pd.DataFrame(self.items)

        print(f"\n¦ Total Items: {len(self.items)}")
        print(f"° Items with Pricing: {df['unit_price'].notna().sum()}")
        print(f"·  Items with Part Numbers: {df[df['part_number'] != '']['part_number'].count()}")

        print("\n Items by Category:")
        category_counts = df['category'].value_counts()
        for category, count in category_counts.items():
            print(f"   {category}: {count}")

        print("\nª Items by Supplier:")
        supplier_counts = df['supplier'].value_counts()
        for supplier, count in supplier_counts.items():
            print(f"   {supplier}: {count}")

        total_value = df[df['unit_price'].notna()].apply(
            lambda row: row['quantity'] * row['unit_price'], axis=1
        ).sum()
        print(f"\nµ Total Inventory Value (items with pricing): {total_value:,.2f}")

        print("\n  Items needing categorization:")
        uncategorized = df[df['category'] == 'Uncategorized']
        if len(uncategorized) > 0:
            print(f"   {len(uncategorized)} items in 'Uncategorized'")
            print("   Sample uncategorized items:")
            for idx, row in uncategorized.head(5).iterrows():
                print(f"      - {row['name'][:60]}")
        else:
            print("    All items categorized!")

    def export_to_csv(self, output_file: str = 'inventory_data/cleaned_inventory.csv'):
        """Export cleaned data to CSV"""
        print(f"\n¾ Exporting to {output_file}...")
        df = pd.DataFrame(self.items)

        # Reorder columns for better readability
        columns_order = [
            'category', 'name', 'part_number', 'quantity', 'min_stock_level',
            'unit_price', 'supplier', 'specifications', 'location',
            'purchase_date', 'order_number', 'notes', 'original_name'
        ]

        df = df[columns_order]
        df.to_csv(output_file, index=False, encoding='utf-8')

        print(f" Exported {len(df)} items to {output_file}")

        return output_file


def main():
    """Main execution function"""
    print("€ Electronics Lab Inventory Import Tool")
    print("=" * 60)

    importer = InventoryImporter()

    # Process both files
    importer.process_robu_file('inventory_data/robu_orders.xlsx')
    importer.process_components_file('inventory_data/components_inventory.xlsx')

    # Remove duplicates
    importer.remove_duplicates()

    # Generate report
    importer.generate_report()

    # Export to CSV
    output_file = importer.export_to_csv()

    print("\n" + "="*60)
    print(" Import processing complete!")
    print("="*60)
    print(f"\n„ Next steps:")
    print(f"   1. Review the cleaned data: {output_file}")
    print(f"   2. Check uncategorized items and adjust if needed")
    print(f"   3. Run the database import script to load into CRM")
    print("\n")


if __name__ == "__main__":
    main()
