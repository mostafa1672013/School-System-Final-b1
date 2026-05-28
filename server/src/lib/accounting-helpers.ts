import { PrismaClient } from '@prisma/client';

export async function getActivePeriodId(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  date: string // YYYY-MM-DD
): Promise<string | null> {
  const period = await tx.accountingPeriod.findFirst({
    where: {
      startDate: { lte: date },
      endDate:   { gte: date },
      status: 'open'
    }
  });
  return period?.id ?? null;
}
