import { UserRole } from '@prisma/client';

import { PERMISSIONS, ROLE_PERMISSIONS, can, isPermissionKey } from '../src/common/permissions';

/**
 * La matriz de permisos es de las pocas cosas donde un error no se ve: nadie
 * nota que un rol tiene de más hasta que alguien exporta pacientes. Estas
 * pruebas fijan las invariantes que no pueden romperse al editarla.
 */
describe('matriz de permisos', () => {
  const roles = Object.values(UserRole);

  it('cubre todos los roles del enum de la base', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([...roles].sort());
  });

  it('no concede permisos que no existan en el catálogo', () => {
    for (const [rol, permisos] of Object.entries(ROLE_PERMISSIONS)) {
      const desconocidos = permisos.filter((p) => !isPermissionKey(p));
      expect({ rol, desconocidos }).toEqual({ rol, desconocidos: [] });
    }
  });

  it('SUPERADMIN lo tiene todo y nadie más', () => {
    expect(ROLE_PERMISSIONS.SUPERADMIN).toHaveLength(PERMISSIONS.length);
    for (const rol of roles.filter((r) => r !== UserRole.SUPERADMIN)) {
      expect(ROLE_PERMISSIONS[rol].length).toBeLessThan(PERMISSIONS.length);
    }
  });

  it('AUDITOR no escribe nada: revisa, no opera', () => {
    const escrituras = ROLE_PERMISSIONS.AUDITOR.filter((p) =>
      /\.(write|manage|cancel|checkin|merge|overbook|toggle|configure)$/.test(p),
    );
    expect(escrituras).toEqual([]);
  });

  it('exportar pacientes está reservado: es una fuga de datos de salud', () => {
    const conExport = roles.filter((r) => ROLE_PERMISSIONS[r].includes('patient.export'));
    expect(conExport.sort()).toEqual([UserRole.AUDITOR, UserRole.SUPERADMIN].sort());
  });

  it('recepción ve su sede, no las demás', () => {
    const recepcion = { role: UserRole.RECEPCION };
    expect(can(recepcion, 'appointment.write')).toBe(true);
    expect(can(recepcion, 'patient.read_cross_site')).toBe(false);
    expect(can(recepcion, 'dashboard.read_all_sites')).toBe(false);
    expect(can(recepcion, 'user.manage')).toBe(false);
  });

  it('los permisos extra suman al rol, pero solo si son válidos', () => {
    const user = { role: UserRole.RECEPCION, extraPermissions: ['audit.read', 'inventado.total'] };
    expect(can(user, 'audit.read')).toBe(true);
    expect(can(user, 'user.manage')).toBe(false);
  });
});
