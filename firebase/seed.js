import { buildDemoOrders } from './shared/seed-data.js';

const projectId = process.env.FIRESTORE_PROJECT_ID || 'demo-lajosllm';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const documentsUrl = `http://${emulatorHost}/v1/projects/${projectId}/databases/(default)/documents`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForEmulator(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // Any HTTP response means the emulator is listening.
      await fetch(`${documentsUrl}/orders?pageSize=1`);
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`Firestore emulator at ${emulatorHost} did not start in time.`);
}

function toFields(order) {
  return {
    orderId: { stringValue: order.orderId },
    createdAt: { timestampValue: order.createdAt },
    status: { stringValue: order.status },
    amount: { doubleValue: order.amount },
    customer: { stringValue: order.customer },
    items: {
      arrayValue: {
        values: order.items.map((item) => ({ stringValue: item })),
      },
    },
  };
}

async function writeOrder(order) {
  // PATCH upserts the document, so the seed job can be run repeatedly.
  const response = await fetch(
    `${documentsUrl}/orders/${encodeURIComponent(order.orderId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFields(order) }),
    },
  );
  if (!response.ok) {
    throw new Error(`${order.orderId}: HTTP ${response.status} ${await response.text()}`);
  }
}

async function main() {
  await waitForEmulator();

  const orders = buildDemoOrders();
  for (let i = 0; i < orders.length; i += 20) {
    await Promise.all(orders.slice(i, i + 20).map(writeOrder));
  }

  console.log(`Seeded ${orders.length} demo orders into project "${projectId}".`);
  console.log(`Firestore emulator: http://${emulatorHost}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
