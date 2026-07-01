import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

type AreaType = 'TRANSVERSAL' | 'EMISSIVE' | 'RECEPTIVE';
type RoleType = 'OPERATIONAL' | 'TACTICAL' | 'STRATEGIC';

export class OrganizationService {

  // ── ÁREAS (Departments) ─────────────────────────────────────────────────────

  /** Devuelve todas las áreas de primer nivel con sus subáreas y cargos */
  async getAreas(db: PrismaClient, includeInactive = false) {
    return db.department.findMany({
      where: {
        parentId: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          include: {
            _count: { select: { employees: true, positions: true } },
          },
          orderBy: { name: 'asc' },
        },
        positions: {
          where: includeInactive ? {} : { isActive: true },
          select: { id: true, name: true, hierarchyLevel: true, roleType: true, isActive: true },
          orderBy: { hierarchyLevel: 'asc' },
        },
        _count: { select: { employees: true, children: true, positions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Crea un área de primer nivel */
  async createArea(
    data: { name: string; description?: string; code?: string | null; areaType?: AreaType },
    db: PrismaClient,
  ) {
    await this._assertNameUnique(data.name, null, undefined, db);
    if (data.code) await this._assertCodeUnique(data.code, undefined, db);

    return db.department.create({
      data: {
        name:        data.name,
        description: data.description,
        code:        data.code ?? null,
        areaType:    data.areaType ?? 'TRANSVERSAL',
        parentId:    null,
      },
    });
  }

  /** Actualiza un área */
  async updateArea(
    id: string,
    data: { name?: string; description?: string; code?: string | null; areaType?: AreaType; isActive?: boolean },
    db: PrismaClient,
  ) {
    const area = await db.department.findUnique({ where: { id } });
    if (!area) throw new AppError('Área no encontrada', 404);

    if (data.name && data.name !== area.name) {
      await this._assertNameUnique(data.name, area.parentId, id, db);
    }
    if (data.code && data.code !== area.code) {
      await this._assertCodeUnique(data.code, id, db);
    }

    return db.department.update({ where: { id }, data });
  }

  /** Elimina un área solo si no tiene empleados, subáreas ni cargos */
  async deleteArea(id: string, db: PrismaClient) {
    const area = await db.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true, children: true, positions: true } } },
    });
    if (!area) throw new AppError('Área no encontrada', 404);
    if (area._count.employees > 0) throw new AppError('No se puede eliminar: hay empleados asignados.', 400);
    if (area._count.children  > 0) throw new AppError('No se puede eliminar: tiene subáreas. Elimínalas primero.', 400);
    if (area._count.positions > 0) throw new AppError('No se puede eliminar: tiene cargos asignados.', 400);

    return db.department.delete({ where: { id } });
  }

  // ── SUBÁREAS ────────────────────────────────────────────────────────────────

  /** Devuelve las subáreas de un área padre */
  async getSubareas(parentId: string, db: PrismaClient, includeInactive = false) {
    const parent = await db.department.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError('Área padre no encontrada', 404);

    return db.department.findMany({
      where: {
        parentId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: { select: { employees: true, positions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Crea una subárea dentro de un área padre */
  async createSubarea(
    parentId: string,
    data: { name: string; description?: string; areaType?: AreaType },
    db: PrismaClient,
  ) {
    const parent = await db.department.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError('Área padre no encontrada', 404);
    if (parent.parentId !== null) throw new AppError('No se pueden anidar más de dos niveles', 400);

    await this._assertNameUnique(data.name, parentId, undefined, db);

    return db.department.create({
      data: {
        name:        data.name,
        description: data.description,
        areaType:    data.areaType ?? parent.areaType,
        parentId,
      },
    });
  }

  // ── CARGOS (Positions) ──────────────────────────────────────────────────────

  /** Devuelve todos los cargos, opcionalmente filtrados por área */
  async getPositions(db: PrismaClient, departmentId?: string, includeInactive = false) {
    return db.position.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count:     { select: { employees: true } },
        department: { select: { id: true, name: true, parentId: true } },
      },
      orderBy: [{ hierarchyLevel: 'asc' }, { name: 'asc' }],
    });
  }

  /** Crea un cargo */
  async createPosition(
    data: { name: string; description?: string; departmentId?: string | null; hierarchyLevel?: number; roleType?: RoleType },
    db: PrismaClient,
  ) {
    const existing = await db.position.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError(`El cargo '${data.name}' ya existe`, 409);

    if (data.departmentId) {
      const dep = await db.department.findUnique({ where: { id: data.departmentId } });
      if (!dep) throw new AppError('El área indicada no existe', 404);
    }

    return db.position.create({
      data: {
        name:           data.name,
        description:    data.description,
        departmentId:   data.departmentId ?? null,
        hierarchyLevel: data.hierarchyLevel ?? 1,
        roleType:       data.roleType ?? 'OPERATIONAL',
      },
    });
  }

  /** Actualiza un cargo */
  async updatePosition(
    id: string,
    data: { name?: string; description?: string; departmentId?: string | null; hierarchyLevel?: number; roleType?: RoleType; isActive?: boolean },
    db: PrismaClient,
  ) {
    const pos = await db.position.findUnique({ where: { id } });
    if (!pos) throw new AppError('Cargo no encontrado', 404);

    if (data.name && data.name !== pos.name) {
      const dup = await db.position.findUnique({ where: { name: data.name } });
      if (dup) throw new AppError(`El cargo '${data.name}' ya existe`, 409);
    }
    if (data.departmentId) {
      const dep = await db.department.findUnique({ where: { id: data.departmentId } });
      if (!dep) throw new AppError('El área indicada no existe', 404);
    }

    return db.position.update({ where: { id }, data });
  }

  /** Elimina un cargo solo si no tiene empleados */
  async deletePosition(id: string, db: PrismaClient) {
    const pos = await db.position.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!pos) throw new AppError('Cargo no encontrado', 404);
    if (pos._count.employees > 0) throw new AppError('No se puede eliminar: hay empleados con este cargo.', 400);

    return db.position.delete({ where: { id } });
  }

  // ── Helpers para candidatos/empleados (retrocompatibilidad) ─────────────────

  /** Devuelve áreas activas (top-level) con subáreas y cargos para selectores de RRHH */
  async getDepartments(db: PrismaClient) {
    return db.department.findMany({
      where: { parentId: null, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            positions: { where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } },
          },
          orderBy: { name: 'asc' },
        },
        positions: { where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── Validaciones privadas ───────────────────────────────────────────────────

  private async _assertNameUnique(
    name: string,
    parentId: string | null,
    excludeId: string | undefined,
    db: PrismaClient,
  ) {
    const exists = await db.department.findFirst({
      where: {
        name,
        parentId: parentId ?? null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (exists) {
      const level = parentId ? 'subárea' : 'área';
      throw new AppError(`Ya existe una ${level} con ese nombre en este nivel`, 409);
    }
  }

  private async _assertCodeUnique(code: string, excludeId: string | undefined, db: PrismaClient) {
    const exists = await db.department.findFirst({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (exists) throw new AppError('Ya existe un área con ese código', 409);
  }
}
