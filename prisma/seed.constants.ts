import type { Prisma } from '../src/generated/prisma/client';

export const DATABASE_URL_MISSING = 'DATABASE_URL is not set';
export const seededProductsMessage = (count: number) =>
  `Seeded ${count} products`;

export const SEED_PRODUCTS: Prisma.ProductCreateInput[] = [
  {
    sku: 'ACC-PWB-20K',
    name: '20,000mAh Power Bank',
    description:
      'Fast-charging 20,000mAh power bank with USB-C and two USB-A ports. Charges most phones 4-5 times.',
    price: 2500000,
    stock: 20,
  },
  {
    sku: 'ACC-EAR-BT5',
    name: 'Wireless Earbuds',
    description:
      'Bluetooth 5.3 earbuds with charging case, up to 24 hours total battery life and touch controls.',
    price: 3200000,
    stock: 15,
  },
  {
    sku: 'ACC-CHG-65W',
    name: '65W USB-C Fast Charger',
    description:
      '65W GaN wall charger that fast-charges phones, tablets and most USB-C laptops.',
    price: 1850000,
    stock: 30,
  },
  {
    sku: 'ACC-CBL-USC',
    name: 'Braided USB-C Cable (2m)',
    description:
      'Durable 2-metre nylon-braided USB-C to USB-C cable, supports 60W charging.',
    price: 450000,
    stock: 50,
  },
  {
    sku: 'ACC-SPK-MIN',
    name: 'Mini Bluetooth Speaker',
    description:
      'Pocket-size waterproof Bluetooth speaker with 12 hours of playtime.',
    price: 2800000,
    stock: 10,
  },
  {
    sku: 'ACC-WTC-SMT',
    name: 'Smart Watch',
    description:
      'Fitness smart watch with heart-rate monitor, sleep tracking and WhatsApp notifications.',
    price: 5500000,
    stock: 0,
  },
];

export const ADMIN_CREDENTIALS_MISSING =
  'ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin user';
export const adminPasswordTooShort = (min: number) =>
  `ADMIN_PASSWORD must be at least ${min} characters`;
export const seededAdminMessage = (email: string) =>
  `Admin user ready: ${email}`;
