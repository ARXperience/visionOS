import { UserRole } from '@prisma/client';

/**
 * Catalogo de permisos y matriz rol -> permisos.
 *
 * El ERP de Servimil hace RBAC de rol unico por endpoint (@Roles('ADMIN')).
 * Eso no alcanza en una clinica: recepcion debe poder ver que existe una cita
 * sin ver el dato clinico del paciente, y la diferencia entre "leer la agenda
 * de mi sede" y "leer la de todas" no es un rol distinto.
 *
 * El rol dice QUE acciones puede hacer un usuario. La verificacion de sede
 * (`scopeBySite`) dice SOBRE QUE instancias. Las dos capas son obligatorias.
 *
 * Solo se declaran permisos de lo que existe o entra en fase 1. Un permiso
 * para un modulo que aun no se construyo es una mentira en el catalogo.
 */
export const PERMISSIONS = [
  // Administracion
  'user.read',
  'user.manage',
  'site.read',
  'site.manage',
  'service.read',
  'service.manage',
  'audit.read',
  'settings.manage',

  // Pacientes
  'patient.read',
  'patient.write',
  /** Ver pacientes de sedes a las que el usuario no esta asignado. */
  'patient.read_cross_site',
  'patient.merge',
  'patient.export',

  // Agenda
  'appointment.read',
  'appointment.write',
  'appointment.cancel',
  /** Agendar por encima de la disponibilidad publicada. */
  'appointment.overbook',
  'appointment.checkin',
  'schedule.manage',
  'waitlist.manage',

  // Conversaciones y comercial
  'conversation.read',
  'conversation.write',
  'conversation.assign',
  'whatsapp.manage',
  'lead.read',
  'lead.write',

  // IA
  'ai.toggle',
  'ai.configure',

  // Tablero
  'dashboard.read',
  'dashboard.read_all_sites',
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_SET.has(value);
}

/** Lo minimo que necesita cualquiera que atienda un mostrador o un chat. */
const BASE_OPERATIVO: PermissionKey[] = [
  'site.read',
  'service.read',
  'patient.read',
  'appointment.read',
  'dashboard.read',
];

/**
 * Matriz rol -> permisos, por enumeracion explicita.
 *
 * Un permiso que no esta listado, no se tiene. Nunca se define por exclusion:
 * agregar un permiso nuevo al catalogo no debe concederselo a nadie por
 * accidente.
 */
export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly PermissionKey[]>> = Object.freeze({
  SUPERADMIN: PERMISSIONS,

  ADMIN_SEDE: [
    ...BASE_OPERATIVO,
    'user.read',
    'patient.write',
    'patient.merge',
    'appointment.write',
    'appointment.cancel',
    'appointment.overbook',
    'appointment.checkin',
    'schedule.manage',
    'waitlist.manage',
    'conversation.read',
    'conversation.write',
    'conversation.assign',
    'lead.read',
    'lead.write',
    'ai.toggle',
    'audit.read',
  ],

  COORDINACION: [
    ...BASE_OPERATIVO,
    'patient.write',
    'patient.read_cross_site',
    'appointment.write',
    'appointment.cancel',
    'appointment.overbook',
    'appointment.checkin',
    'schedule.manage',
    'waitlist.manage',
    'conversation.read',
    'conversation.assign',
    'lead.read',
    'dashboard.read_all_sites',
  ],

  RECEPCION: [
    ...BASE_OPERATIVO,
    'patient.write',
    'appointment.write',
    'appointment.cancel',
    'appointment.checkin',
    'conversation.read',
    'conversation.write',
  ],

  AGENDAMIENTO: [
    ...BASE_OPERATIVO,
    'patient.write',
    'patient.read_cross_site',
    'appointment.write',
    'appointment.cancel',
    'waitlist.manage',
    'conversation.read',
    'conversation.write',
  ],

  CALL_CENTER: [
    ...BASE_OPERATIVO,
    'patient.write',
    'patient.read_cross_site',
    'appointment.write',
    'appointment.cancel',
    'conversation.read',
    'conversation.write',
    'conversation.assign',
    'lead.read',
    'lead.write',
    'ai.toggle',
  ],

  PROFESIONAL: [
    ...BASE_OPERATIVO,
    'patient.read_cross_site',
    'appointment.checkin',
  ],

  FACTURACION: [
    ...BASE_OPERATIVO,
    'patient.read_cross_site',
  ],

  /**
   * Solo lectura, y la lectura tambien queda auditada. Es el rol de quien
   * revisa, no de quien opera: no escribe absolutamente nada.
   */
  AUDITOR: [
    ...BASE_OPERATIVO,
    'patient.read_cross_site',
    'patient.export',
    'audit.read',
    'dashboard.read_all_sites',
    'conversation.read',
    'lead.read',
    'user.read',
  ],
});

/** Permisos efectivos: los del rol mas los concedidos a ese usuario en concreto. */
export function permissionsOf(user: {
  role: UserRole;
  extraPermissions?: readonly string[];
}): ReadonlySet<PermissionKey> {
  const efectivos = new Set<PermissionKey>(ROLE_PERMISSIONS[user.role] ?? []);
  for (const extra of user.extraPermissions ?? []) {
    if (isPermissionKey(extra)) efectivos.add(extra);
  }
  return efectivos;
}

export function can(
  user: { role: UserRole; extraPermissions?: readonly string[] },
  permiso: PermissionKey,
): boolean {
  return permissionsOf(user).has(permiso);
}
