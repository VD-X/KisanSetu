const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const counts = {};
  const models = ['listing', 'delivery', 'order', 'cart', 'cartItem', 'negotiatingChat', 'message'];
  for (const modelName of models) {
    const model = prisma[modelName];
    if (!model || typeof model.count !== 'function') {
      counts[modelName] = 'SKIP(no model)';
      continue;
    }
    counts[modelName] = await model.count();
  }

  process.stdout.write(JSON.stringify(counts, null, 2));
  process.stdout.write('\n');
}

main()
  .catch((error) => {
    process.stderr.write(String(error?.stack || error));
    process.stderr.write('\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });

