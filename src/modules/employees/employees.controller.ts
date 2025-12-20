import { Request, Response, NextFunction } from 'express';
import { EmployeesService } from './employees.service';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { EmployeeStatus } from '@prisma/client'; // Importamos el Enum
const service = new EmployeesService();
const prisma = new PrismaClient();

export const getDirectory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.getAllEmployees();
    res.json(result);
  } catch (error) { next(error); }
};

export const updateAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await service.assignAdministrativeData(id, req.body);
    res.json(result);
  } catch (error) { next(error); }
};


export const getMyTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');
    
    const result = await service.getMyTeamContext(userId);
    res.json(result);
  } catch (error) { next(error); }
};


//to kudo

export const searchEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') return res.json([]);

    const results = await prisma.employee.findMany({
      where: {
        // 1. Filtro por nombre (lo que ya tenías)
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } }
        ],
        // 2. FILTRO CLAVE: Solo empleados ACTIVOS
        // Esto oculta a los cesados del buscador de aplausos
        status: EmployeeStatus.ACTIVE 
      },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        // photoUrl: true
      }
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
};