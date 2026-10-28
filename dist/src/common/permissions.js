"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PERMISSIONS = void 0;
exports.isPermissionKey = isPermissionKey;
exports.permissionsOf = permissionsOf;
exports.can = can;
exports.PERMISSIONS = [
    'user.read',
    'user.manage',
    'site.read',
    'site.manage',
    'service.read',
    'service.manage',
    'audit.read',
    'settings.manage',
    'patient.read',
    'patient.write',
    'patient.read_cross_site',
    'patient.merge',
    'patient.export',
    'appointment.read',
    'appointment.write',
    'appointment.cancel',
    'appointment.overbook',
    'appointment.checkin',
    'schedule.manage',
    'waitlist.manage',
    'conversation.read',
    'conversation.write',
    'conversation.assign',
    'whatsapp.manage',
    'lead.read',
    'lead.write',
    'ai.toggle',
    'ai.configure',
    'dashboard.read',
    'dashboard.read_all_sites',
];
const PERMISSION_SET = new Set(exports.PERMISSIONS);
function isPermissionKey(value) {
    return PERMISSION_SET.has(value);
}
const BASE_OPERATIVO = [
    'site.read',
    'service.read',
    'patient.read',
    'appointment.read',
    'dashboard.read',
];
exports.ROLE_PERMISSIONS = Object.freeze({
    SUPERADMIN: exports.PERMISSIONS,
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
function permissionsOf(user) {
    const efectivos = new Set(exports.ROLE_PERMISSIONS[user.role] ?? []);
    for (const extra of user.extraPermissions ?? []) {
        if (isPermissionKey(extra))
            efectivos.add(extra);
    }
    return efectivos;
}
function can(user, permiso) {
    return permissionsOf(user).has(permiso);
}
//# sourceMappingURL=permissions.js.map