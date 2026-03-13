import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase.from('products').select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const products = (data ?? []).map((r) => ({
    partNumber:    r.part_number,
    description:   r.description,
    lifecycle:     r.lifecycle,
    price1ku:      r.price_1ku != null ? Number(r.price_1ku) : null,
    priceSku:      r.price_sku,
    availability:  r.availability,
    package:       r.package,
    vinMin:        r.vin_min != null ? Number(r.vin_min) : null,
    vinMax:        r.vin_max != null ? Number(r.vin_max) : null,
    voutMin:       r.vout_min != null ? Number(r.vout_min) : null,
    voutMax:       r.vout_max != null ? Number(r.vout_max) : null,
    ioutMax:       r.iout_max != null ? Number(r.iout_max) : null,
    tempMin:       r.temp_min != null ? Number(r.temp_min) : null,
    tempMax:       r.temp_max != null ? Number(r.temp_max) : null,
    inStock:       r.in_stock,
    rohsCompliant: r.rohs_compliant,
    surfaceMount:  r.surface_mount,
  }));

  res.json(products);
}
