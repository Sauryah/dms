import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const parseSizeToFloat = (sizeStr: string): number => {
  const numericPart = sizeStr.match(/[\d\.]+/);
  if (numericPart) {
    const val = parseFloat(numericPart[0]);
    if (!isNaN(val)) return val;
  }
  return 0.0;
};

async function main() {
  console.log('Starting sizeValue population for pre-existing dies...');
  const dies = await prisma.die.findMany({});
  console.log(`Found ${dies.length} dies to evaluate.`);

  let updatedCount = 0;
  for (const die of dies) {
    const calculatedFloat = parseSizeToFloat(die.size);
    await prisma.die.update({
      where: { id: die.id },
      data: { sizeValue: calculatedFloat }
    });
    updatedCount++;
  }

  console.log(`Finished! Successfully updated sizeValue on ${updatedCount} dies.`);
}

main()
  .catch((e) => {
    console.error('Error populating sizeValue:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
