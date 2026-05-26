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

export const formatSizeString = (sizeStr: string): string => {
  const numericMatch = sizeStr.match(/[\d\.]+/);
  if (numericMatch) {
    const numVal = parseFloat(numericMatch[0]);
    if (!isNaN(numVal)) {
      const formattedNum = numVal.toFixed(3);
      return sizeStr.replace(numericMatch[0], formattedNum);
    }
  }
  return sizeStr;
};

async function main() {
  console.log('Starting size and sizeValue formatting migration for pre-existing dies...');
  const dies = await prisma.die.findMany({});
  console.log(`Found ${dies.length} dies to evaluate.`);

  let updatedCount = 0;
  for (const die of dies) {
    const formattedSize = formatSizeString(die.size);
    const calculatedFloat = parseSizeToFloat(formattedSize);
    
    console.log(`Updating Die ${die.dieId}: "${die.size}" -> "${formattedSize}" (sizeValue: ${calculatedFloat})`);
    
    await prisma.die.update({
      where: { id: die.id },
      data: { 
        size: formattedSize,
        sizeValue: calculatedFloat 
      }
    });
    updatedCount++;
  }

  console.log(`Finished! Successfully updated size and sizeValue on ${updatedCount} dies.`);
}

main()
  .catch((e) => {
    console.error('Error migrating existing dies:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
