const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const modelsInDeleteOrder = [
    'message',
    'negotiatingChat',
    'delivery',
    'cartItem',
    'cart',
    'order',
    'listing',
    'imageVerification'
  ];

  const results = {};
  for (const modelName of modelsInDeleteOrder) {
    const model = prisma[modelName];
    if (!model || typeof model.deleteMany !== 'function') {
      results[modelName] = 'SKIP(no model)';
      continue;
    }
    const res = await model.deleteMany({});
    results[modelName] = res.count;
  }

  process.stdout.write('PURGE COMPLETE\n');
  process.stdout.write(JSON.stringify(results, null, 2));
  process.stdout.write('\n');
}

main()
  .catch((error) => {
    process.stderr.write('PURGE FAILED\n');
    process.stderr.write(String(error?.stack || error));
    process.stderr.write('\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });
