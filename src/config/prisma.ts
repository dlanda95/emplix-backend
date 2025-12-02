import { PrismaClient } from '@prisma/client';

// Versión Estable (v5+):
// No pasamos parámetros. Prisma lee automáticamente el .env gracias a tu schema.prisma
export const prisma = new PrismaClient();

export default prisma;