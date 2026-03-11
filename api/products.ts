import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { loadProducts } from '../server/loader.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const products = loadProducts(path.join(process.cwd(), 'data/products.xlsx'));
  res.json(products);
}
