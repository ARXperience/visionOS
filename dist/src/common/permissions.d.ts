import { UserRole } from '@prisma/client';
export declare const PERMISSIONS: readonly ["user.read", "user.manage", "site.read", "site.manage", "service.read", "service.manage", "audit.read", "settings.manage", "patient.read", "patient.write", "patient.read_cross_site", "patient.merge", "patient.export", "appointment.read", "appointment.write", "appointment.cancel", "appointment.overbook", "appointment.checkin", "schedule.manage", "waitlist.manage", "conversation.read", "conversation.write", "conversation.assign", "whatsapp.manage", "lead.read", "lead.write", "ai.toggle", "ai.configure", "dashboard.read", "dashboard.read_all_sites"];
export type PermissionKey = (typeof PERMISSIONS)[number];
export declare function isPermissionKey(value: string): value is PermissionKey;
export declare const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly PermissionKey[]>>;
export declare function permissionsOf(user: {
    role: UserRole;
    extraPermissions?: readonly string[];
}): ReadonlySet<PermissionKey>;
export declare function can(user: {
    role: UserRole;
    extraPermissions?: readonly string[];
}, permiso: PermissionKey): boolean;
