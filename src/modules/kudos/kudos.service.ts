import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';
import { buildPublicUrl } from '../../shared/utils/storage.util';
import { getScore } from './kudos.config';

// Selector reutilizable para incluir el avatar del empleado en consultas
const EMPLOYEE_WITH_AVATAR = {
  id: true, userId: true, firstName: true, lastName: true,
  documents: { where: { type: 'AVATAR' as const }, select: { path: true }, take: 1 },
  position:  { select: { name: true } },
};

export class KudosService {

  async getAll(userId: string, db: PrismaClient) {
    return db.kudo.findMany({
      where: {
        OR: [
          { sender:   { userId } },
          { receiver: { userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender:   { select: EMPLOYEE_WITH_AVATAR },
        receiver: { select: EMPLOYEE_WITH_AVATAR },
      },
    });
  }

  async create(
    senderUserId: string,
    receiverId:   string,
    categoryCode: string,
    message:      string,
    db:           PrismaClient,
  ) {
    const sender = await db.employee.findUnique({
      where:  { userId: senderUserId },
      select: { id: true, status: true },
    });

    if (!sender || sender.status !== 'ACTIVE') {
      throw new AppError('No se encontró tu perfil de empleado activo.', 400, 'SENDER_NOT_FOUND');
    }

    const receiver = await db.employee.findUnique({ where: { id: receiverId } });

    if (!receiver) {
      throw new AppError('El destinatario no existe.', 404, 'RECEIVER_NOT_FOUND');
    }

    if (sender.id === receiver.id) {
      throw new AppError('No puedes enviarte aplausos a ti mismo.', 400, 'SELF_KUDO');
    }

    return db.kudo.create({ data: { categoryCode, message, senderId: sender.id, receiverId } });
  }

  async getAnalytics(db: PrismaClient) {
    const employees = await db.employee.findMany({
      where:  { status: 'ACTIVE' },
      select: {
        id: true, firstName: true, lastName: true,
        position:      { select: { name: true } },
        receivedKudos: { select: { categoryCode: true } },
      },
    });

    return employees
      .map(emp => {
        const breakdown: Record<string, number> = {};
        let totalScore = 0;

        for (const kudo of emp.receivedKudos) {
          breakdown[kudo.categoryCode] = (breakdown[kudo.categoryCode] ?? 0) + 1;
          totalScore += getScore(kudo.categoryCode);
        }

        return {
          employeeId: emp.id,
          name:       `${emp.firstName} ${emp.lastName}`,
          position:   emp.position?.name ?? 'Sin cargo',
          totalKudos: emp.receivedKudos.length,
          totalScore,
          breakdown,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }
}

/** Transforma un empleado del resultado de Prisma añadiendo su URL de avatar. */
export function formatEmployeeForKudo(emp: {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  documents: { path: string }[];
  position:  { name: string } | null;
}) {
  return {
    id:        emp.id,
    firstName: emp.firstName,
    lastName:  emp.lastName,
    photoUrl:  buildPublicUrl(emp.documents[0]?.path),
    position:  emp.position?.name ?? null,
  };
}
