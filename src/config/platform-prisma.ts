import { PrismaClient } from '../generated/platform-client';

const globalForPrisma = globalThis as unknown as { platformPrisma: PrismaClient };

export const platformPrisma =
  globalForPrisma.platformPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.platformPrisma = platformPrisma;
}

export default platformPrisma;
