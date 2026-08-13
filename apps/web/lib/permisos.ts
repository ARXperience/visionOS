/**
 * Copia de los permisos del servidor, solo para decidir qué se pinta.
 *
 * La autorización de verdad ocurre en la API: aquí un permiso de más no
 * concede nada, solo muestra un menú que devolverá 403. Se duplica el tipo y
 * no el catálogo entero para que no haya dos fuentes de verdad que mantener
 * sincronizadas.
 */
export type PermissionKey =
  | 'user.read'
  | 'user.manage'
  | 'site.read'
  | 'site.manage'
  | 'service.read'
  | 'service.manage'
  | 'audit.read'
  | 'settings.manage'
  | 'patient.read'
  | 'patient.write'
  | 'patient.read_cross_site'
  | 'patient.merge'
  | 'patient.export'
  | 'appointment.read'
  | 'appointment.write'
  | 'appointment.cancel'
  | 'appointment.overbook'
  | 'appointment.checkin'
  | 'schedule.manage'
  | 'waitlist.manage'
  | 'conversation.read'
  | 'conversation.write'
  | 'conversation.assign'
  | 'whatsapp.manage'
  | 'lead.read'
  | 'lead.write'
  | 'ai.toggle'
  | 'ai.configure'
  | 'dashboard.read'
  | 'dashboard.read_all_sites';
