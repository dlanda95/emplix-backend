import { PrismaClient } from '../../generated/tenant-client';
import { getScore } from './kudos.config';
import { AppError } from '../../shared/middlewares/error.middleware';

const getPublicUrl = (path: string | undefined) => {
  if (!path) return null;
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  return account ? `https://${account}.blob.core.windows.net/public-assets/${path}` : null;
};

export class KudosService {

  async getAll(userId: string, db: PrismaClient) {
    return db.kudo.findMany({
      where: {
        OR: [
          { sender: { userId } },
          { receiver: { userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true, userId: true, firstName: true, lastName: true,
            documents: { where: { type: 'AVATAR' }, select: { path: true }, take: 1 },
            position: { select: { name: true } },
          },
        },
        receiver: {
          select: {
            id: true, userId: true, firstName: true, lastName: true,
            documents: { where: { type: 'AVATAR' }, select: { path: true }, take: 1 },
            position: { select: { name: true } },
          },
        },
      },
    });
  }

  async create(userId: string, receiverId: string, categoryCode: string, message: string, db: PrismaClient) {
    const sender = await db.employee.findUnique({ where: { userId }, select: { id: true, status: true } });
    if (!sender || sender.status !== 'ACTIVE') throw new Error('SENDER_NOT_FOUND');

    const receiver = await db.employee.findUnique({ where: { id: receiverId } });
    if (!receiver) throw new Error('RECEIVER_NOT_FOUND');
    if (sender.id === receiver.id) throw new AppError('No puedes enviarte aplausos a ti mismo', 400);

    return db.kudo.create({ data: { categoryCode, message, senderId: sender.id, receiverId } });
  }

  async getAnalytics(db: PrismaClient) {
    const employees = await db.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, firstName: true, lastName: true,
        position: { select: { name: true } },
        receivedKudos: { select: { categoryCode: true } },
      },
    });

    return employees
      .map(emp => {
        let totalScore = 0;
        const breakdown: Record<string, number> = {};
        emp.receivedKudos.forEach(k => {
          breakdown[k.categoryCode] = (breakdown[k.categoryCode] || 0) + 1;
          totalScore += getScore(k.categoryCode);
        });
        return {
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          position: emp.position?.name ?? 'Sin cargo',
          totalKudos: emp.receivedKudos.length,
          totalScore,
          breakdown,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }
}
