import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Product } from '../src/types/product.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const v = val.toLowerCase().trim();
    return v === 'yes' || v === 'true' || v === 'y' || v === '1';
  }
  return false;
}

function parseNumber(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// Column name aliases from the Excel file
// These will be updated once we see the actual column names
const COLUMN_MAP: Record<string, keyof Product> = {
  // Part number variants
  'part number': 'partNumber',
  'partnumber': 'partNumber',
  'part': 'partNumber',
  'part_number': 'partNumber',
  'model': 'partNumber',
  'mpn': 'partNumber',

  // Description
  'description': 'description',
  'product description': 'description',

  // Lifecycle
  'lifecycle': 'lifecycle',
  'product lifecycle': 'lifecycle',
  'status': 'lifecycle',
  'product status': 'lifecycle',

  // Price
  '1ku list price': 'price1ku',
  '1k price': 'price1ku',
  'price': 'price1ku',
  '1000 qty price': 'price1ku',
  'unit price': 'price1ku',
  'price (usd)': 'price1ku',
  'price usd': 'price1ku',

  // Availability
  'availability': 'availability',
  'stock': 'availability',
  'qty in stock': 'availability',
  'quantity': 'availability',
  'inventory': 'availability',

  // Package
  'package': 'package',
  'package type': 'package',
  'packaging': 'package',

  // Voltage
  'vin min': 'vinMin',
  'vin_min': 'vinMin',
  'min vin': 'vinMin',
  'input voltage min': 'vinMin',
  'vin min (v)': 'vinMin',

  'vin max': 'vinMax',
  'vin_max': 'vinMax',
  'max vin': 'vinMax',
  'input voltage max': 'vinMax',
  'vin max (v)': 'vinMax',

  'vout min': 'voutMin',
  'vout_min': 'voutMin',
  'output voltage min': 'voutMin',

  'vout max': 'voutMax',
  'vout_max': 'voutMax',
  'output voltage max': 'voutMax',

  // Current
  'iout max': 'ioutMax',
  'iout_max': 'ioutMax',
  'max output current': 'ioutMax',
  'output current max': 'ioutMax',

  // Temp
  'temp min': 'tempMin',
  'temperature min': 'tempMin',
  'min temp': 'tempMin',
  'operating temp min': 'tempMin',

  'temp max': 'tempMax',
  'temperature max': 'tempMax',
  'max temp': 'tempMax',
  'operating temp max': 'tempMax',

  // Booleans
  'rohs': 'rohsCompliant',
  'rohs compliant': 'rohsCompliant',
  'rohs compliance': 'rohsCompliant',

  'surface mount': 'surfaceMount',
  'mount type': 'surfaceMount',
  'mounting': 'surfaceMount',
};

export function loadProducts(excelPath?: string): Product[] {
  const filePath = excelPath || path.join(__dirname, '../../data/products.xlsx');

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch {
    console.warn(`[loader] Excel file not found at ${filePath}. Using mock data.`);
    return getMockProducts();
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (rows.length === 0) {
    console.warn('[loader] Excel sheet is empty. Using mock data.');
    return getMockProducts();
  }

  // Print column names for debugging
  const cols = Object.keys(rows[0]);
  console.log('[loader] Excel columns:', cols);

  return rows.map((row, idx): Product => {
    const mapped: Partial<Product> = {};

    for (const [rawKey, rawVal] of Object.entries(row)) {
      const normalizedKey = rawKey.toLowerCase().trim();
      const productKey = COLUMN_MAP[normalizedKey];
      if (productKey) {
        (mapped as Record<string, unknown>)[productKey] = rawVal;
      } else {
        // Store unmapped columns with sanitized key for display
        const safeKey = rawKey.replace(/[^a-zA-Z0-9_]/g, '_');
        (mapped as Record<string, unknown>)[safeKey] = rawVal;
      }
    }

    // Parse numeric fields
    const price = parseNumber(mapped.price1ku);
    const priceSku = price != null ? `$${price.toFixed(2)}` : '';

    // Determine inStock from availability
    const availability = parseNumber(mapped.availability);
    const inStock = availability != null ? availability > 0 : false;

    // Determine surfaceMount from package string if not explicit
    let surfaceMount = normalizeBoolean(mapped.surfaceMount);
    if (!mapped.surfaceMount && mapped.package) {
      const pkg = String(mapped.package).toUpperCase();
      surfaceMount = ['TSSOP', 'SOIC', 'QFN', 'DFN', 'LGA', 'BGA', 'SOT', 'SOP', 'MSOP', 'LQP', 'QFP'].some(t => pkg.includes(t));
    }

    return {
      partNumber: String(mapped.partNumber || `PART-${idx + 1}`),
      description: String(mapped.description || ''),
      lifecycle: String(mapped.lifecycle || 'PRODUCTION'),
      price1ku: price,
      priceSku,
      availability,
      package: String(mapped.package || ''),
      vinMin: parseNumber(mapped.vinMin),
      vinMax: parseNumber(mapped.vinMax),
      voutMin: parseNumber(mapped.voutMin),
      voutMax: parseNumber(mapped.voutMax),
      ioutMax: parseNumber(mapped.ioutMax),
      tempMin: parseNumber(mapped.tempMin),
      tempMax: parseNumber(mapped.tempMax),
      inStock,
      rohsCompliant: normalizeBoolean(mapped.rohsCompliant ?? true),
      surfaceMount,
      ...mapped,
    };
  });
}

function getMockProducts(): Product[] {
  return [
    {
      partNumber: 'LTM4652 (dual output)',
      description: 'Source/Sink Dual ±25A or Single ±50A µModule Regulator with Input Overvoltage Protection',
      lifecycle: 'RECOMMENDED FOR NEW DESIGNS',
      price1ku: 60.78,
      priceSku: '$60.78 (LTM4652EY#PBF)',
      availability: 1008,
      package: '144-Lead (16mm × 16mm × 4.92mm)',
      vinMin: 4.5, vinMax: 18, voutMin: -1, voutMax: 5,
      ioutMax: 50, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LTM4652 (single output)',
      description: 'Source/Sink Dual ±25A or Single ±50A µModule Regulator with Input Overvoltage Protection',
      lifecycle: 'RECOMMENDED FOR NEW DESIGNS',
      price1ku: 60.78,
      priceSku: '$60.78 (LTM4652EY#PBF)',
      availability: 1008,
      package: '144-Lead (16mm × 16mm × 4.92mm)',
      vinMin: 4.5, vinMax: 18, voutMin: -1, voutMax: 5,
      ioutMax: 25, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'MAX32010',
      description: '25V Span, 1.2A Device Power Supply (DPS)',
      lifecycle: 'PRODUCTION',
      price1ku: 30.61,
      priceSku: '$30.61 (MAX32010CCQ+)',
      availability: null,
      package: '100-TQFP_EP-14X14X1.0',
      vinMin: 2.7, vinMax: 25, voutMin: 1.2, voutMax: 15,
      ioutMax: 1.2, tempMin: -40, tempMax: 85,
      inStock: false, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LT3083',
      description: 'Adjustable 3A Single Resistor Low Dropout Regulator',
      lifecycle: 'RECOMMENDED FOR NEW DESIGNS',
      price1ku: 4.55,
      priceSku: '$4.55 (LT3083EDF#PBF)',
      availability: 80994,
      package: '5-Lead TO-220, 5-Lead DD Pak, 5-Lead TO-220 (Flow 40), 16-Lead DFN (4mm × 4mm w/ EP)',
      vinMin: 1.5, vinMax: 20, voutMin: 0, voutMax: 18.5,
      ioutMax: 3, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LTM8042',
      description: 'µModule (Power Module) Boost LED Driver and Current Source',
      lifecycle: 'PRODUCTION',
      price1ku: 10.31,
      priceSku: '$10.31 (LTM8042EV#PBF)',
      availability: 822,
      package: '77-Lead LGA (15mm × 9mm × 2.82mm)',
      vinMin: 3, vinMax: 36, voutMin: null, voutMax: 65,
      ioutMax: 1, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LTM8042-1',
      description: 'µModule (Power Module) Boost LED Driver and Current Source',
      lifecycle: 'PRODUCTION',
      price1ku: 10.31,
      priceSku: '$10.31 (LTM8042EV-1#PBF)',
      availability: 822,
      package: '77-Lead LGA (15mm × 9mm × 2.82mm)',
      vinMin: 3, vinMax: 36, voutMin: null, voutMax: 65,
      ioutMax: 1, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LT3082',
      description: '200mA Single Resistor Low Dropout Linear Regulator',
      lifecycle: 'RECOMMENDED FOR NEW DESIGNS',
      price1ku: 1.71,
      priceSku: '$1.71 (LT3082ETS8#TRMPBF)',
      availability: 48193,
      package: '3-Lead SOT-223, 8-Lead DFN (3mm × 3mm × 0.75mm w/ EP)',
      vinMin: 1.5, vinMax: 20, voutMin: 0, voutMax: 18.5,
      ioutMax: 0.2, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LT3092',
      description: '200mA 2-Terminal Programmable Current Source',
      lifecycle: 'PRODUCTION',
      price1ku: 2.00,
      priceSku: '$2.00 (ILT3092ETS8#TRMPBF)',
      availability: 42376,
      package: '3-Lead SOT-223, 8-Lead DFN (3mm × 3mm × 0.75mm w/ EP)',
      vinMin: 1.2, vinMax: 40, voutMin: null, voutMax: null,
      ioutMax: 0.2, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LT3085',
      description: 'Adjustable 500mA Single Resistor Low Dropout Linear Regulator',
      lifecycle: 'PRODUCTION',
      price1ku: 2.10,
      priceSku: '$2.10 (LT3085ETS8#PBF)',
      availability: 61555,
      package: '8-Lead MSOP w/ EP, 6-Lead SOT-23',
      vinMin: 1.5, vinMax: 20, voutMin: 0, voutMax: 18.5,
      ioutMax: 0.5, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LT3080',
      description: '1.1A Single Resistor Parallel Programmable Low Dropout Regulator',
      lifecycle: 'RECOMMENDED FOR NEW DESIGNS',
      price1ku: 3.29,
      priceSku: '$3.29 (LT3080ETS8-1#TRPBF)',
      availability: 15623,
      package: '8-Lead SOT-23, 8-Lead TSOT-23',
      vinMin: 1.5, vinMax: 20, voutMin: 0, voutMax: 18.5,
      ioutMax: 1.1, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LT1963',
      description: '1.5A, Low Noise, Fast Transient Response LDO Regulator',
      lifecycle: 'PRODUCTION',
      price1ku: 2.45,
      priceSku: '$2.45 (LT1963AES8#PBF)',
      availability: 32100,
      package: '8-Lead SO, 8-Lead MSOP',
      vinMin: 1.8, vinMax: 20, voutMin: 1.21, voutMax: 20,
      ioutMax: 1.5, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
    {
      partNumber: 'LT3060',
      description: '600mA Low Dropout, Low Noise Regulator with Soft-Start',
      lifecycle: 'PRODUCTION',
      price1ku: 1.55,
      priceSku: '$1.55 (LT3060EDC#TRMPBF)',
      availability: 22000,
      package: '2-Lead SOT-143, 4-Lead DFN',
      vinMin: 1.7, vinMax: 45, voutMin: 1.8, voutMax: 45,
      ioutMax: 0.6, tempMin: -40, tempMax: 125,
      inStock: true, rohsCompliant: true, surfaceMount: true,
    },
  ];
}
