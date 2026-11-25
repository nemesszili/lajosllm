// Deterministic demo data shared by the Docker seed job and the browser's
// "Reset demo data" button. Dates are relative to the time this is called.

const CUSTOMERS = [
  'Ava Patel',
  'Ben Carter',
  'Chloe Dubois',
  'Diego Ramirez',
  'Elena Rossi',
  'Frank Nguyen',
  'Grace Kim',
  'Hugo Silva',
  'Iris Novak',
  'Jonas Weber',
  'Lea Martin',
  'Milo Fischer',
  'Nora Okafor',
  'Oscar Lind',
  'Priya Shah',
];

const CATALOG = [
  'Espresso beans 1kg',
  'Pour-over kettle',
  'Ceramic mug',
  'Filter papers',
  'Milk frother',
  'Travel tumbler',
  'Hand grinder',
  'Tasting box',
];

// Weighted toward paid/shipped so revenue questions have meaningful answers.
const STATUSES = [
  'paid', 'paid', 'paid', 'paid',
  'shipped', 'shipped', 'shipped',
  'pending', 'pending',
  'cancelled',
];

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a stable set of demo orders.
 * 42 orders in the last 24h, 28 more in the last 1-3 days, 15 in the last 3-7 days.
 */
export function buildDemoOrders(now = new Date()) {
  const random = mulberry32(0xc0ffee);
  const groups = [
    { count: 42, minHours: 0, maxHours: 24 },
    { count: 28, minHours: 24, maxHours: 72 },
    { count: 15, minHours: 72, maxHours: 168 },
  ];

  const orders = [];
  let index = 0;

  for (const group of groups) {
    for (let i = 0; i < group.count; i += 1) {
      index += 1;
      const ageHours = group.minHours + random() * (group.maxHours - group.minHours);
      const createdAt = new Date(now.getTime() - ageHours * 60 * 60 * 1000);
      const itemCount = 1 + Math.floor(random() * 3);
      const items = [];
      for (let j = 0; j < itemCount; j += 1) {
        items.push(CATALOG[Math.floor(random() * CATALOG.length)]);
      }

      orders.push({
        orderId: `order-${String(index).padStart(4, '0')}`,
        createdAt: createdAt.toISOString(),
        status: STATUSES[Math.floor(random() * STATUSES.length)],
        amount: Math.round((18 + random() * 420) * 100) / 100,
        customer: CUSTOMERS[Math.floor(random() * CUSTOMERS.length)],
        items,
      });
    }
  }

  return orders;
}
