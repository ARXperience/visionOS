import type { PermissionKey } from './permisos';

/**
 * El mapa del ecosistema. Fuente única: de aquí salen la barra lateral, la
 * rejilla del centro de control y la ruta genérica de lo aún no construido.
 *
 * El estado es honesto a propósito. Un módulo con pantalla de mentira que
 * parece funcionar es peor que uno que no existe: en una clínica alguien lo
 * usa, cree que agendó, y el paciente llega a una cita que no está. Por eso
 * `planeado` no abre nada — explica qué hará y en qué entrega.
 *
 * Las entregas (E2…E7) son las del plan de fase 1: docs/plan-fase-1.md.
 */
export type EstadoModulo = 'disponible' | 'construccion' | 'planeado';

export interface Modulo {
  id: string;
  nombre: string;
  grupo: string;
  icono: string;
  estado: EstadoModulo;
  /** Qué hace, en una frase, para quien nunca lo ha visto. */
  resumen: string;
  /** Entrega en la que llega. `null` = fuera de fase 1. */
  entrega: string | null;
  /** Sin este permiso, el módulo no aparece en el menú. */
  permiso?: PermissionKey;
}

export const MODULOS: Modulo[] = [
  // ── Operación diaria ──────────────────────────────────────────────
  {
    id: '',
    nombre: 'Centro de control',
    grupo: 'Operación',
    icono: 'tablero',
    estado: 'disponible',
    resumen: 'Lo que está pasando hoy en las tres sedes.',
    entrega: 'E7',
    permiso: 'dashboard.read',
  },
  {
    id: 'inbox',
    nombre: 'Inbox y WhatsApp',
    grupo: 'Operación',
    icono: 'chat',
    estado: 'disponible',
    resumen:
      'Todas las conversaciones en una bandeja: paciente, sede, responsable y estado. Responder, transferir, dejar notas y pausar la IA.',
    entrega: 'E2',
    permiso: 'conversation.read',
  },
  {
    id: 'agenda',
    nombre: 'Agenda clínica',
    grupo: 'Operación',
    icono: 'calendario',
    estado: 'planeado',
    resumen:
      'Sede, consultorio, profesional y equipo a la vez. La base impide la doble reserva, no la aplicación.',
    entrega: 'E3',
    permiso: 'appointment.read',
  },
  {
    id: 'recepcion',
    nombre: 'Recepción y admisión',
    grupo: 'Operación',
    icono: 'puerta',
    estado: 'planeado',
    resumen:
      'Check-in, documentos pendientes, autorización, sala de espera y llamado. Programado → llegó → en atención → finalizado.',
    entrega: 'E3',
    permiso: 'appointment.checkin',
  },
  {
    id: 'seguimiento',
    nombre: 'Seguimiento y recordatorios',
    grupo: 'Operación',
    icono: 'campana',
    estado: 'planeado',
    resumen:
      'Recordatorio a 24 y 2 horas, confirmación por WhatsApp, no-show y lista de espera que ocupa el cupo liberado.',
    entrega: 'E6',
    permiso: 'appointment.read',
  },

  // ── Pacientes ─────────────────────────────────────────────────────
  {
    id: 'pacientes',
    nombre: 'Paciente 360°',
    grupo: 'Pacientes',
    icono: 'persona',
    estado: 'planeado',
    resumen:
      'Ficha única con identificación, aseguradores, citas, órdenes, documentos y toda la conversación, en una sola línea de tiempo.',
    entrega: 'E4',
    permiso: 'patient.read',
  },
  {
    id: 'historia',
    nombre: 'Historia clínica',
    grupo: 'Pacientes',
    icono: 'expediente',
    estado: 'planeado',
    resumen:
      'Fuera del alcance por decisión propia: es un producto sanitario regulado (Res. 1995/1999, IHCE). Se modela el dato mínimo para no cerrar la puerta.',
    entrega: null,
  },
  {
    id: 'examenes',
    nombre: 'Exámenes diagnósticos',
    grupo: 'Pacientes',
    icono: 'escaner',
    estado: 'planeado',
    resumen: 'Orden → agenda → realización → resultado → entrega. OCT, campo visual, Pentacam, ecografía.',
    entrega: null,
  },
  {
    id: 'cirugias',
    nombre: 'Cirugías',
    grupo: 'Pacientes',
    icono: 'diana',
    estado: 'planeado',
    resumen:
      'Candidato → valoración → exámenes → autorización → prequirúrgicos → cirugía → control. El quirófano ya es un recurso de la agenda.',
    entrega: null,
  },
  {
    id: 'pqrsf',
    nombre: 'PQRSF y experiencia',
    grupo: 'Pacientes',
    icono: 'buzon',
    estado: 'planeado',
    resumen: 'Radicación, responsable, SLA y resolución, colgando de la misma ficha del paciente.',
    entrega: null,
  },

  // ── Inteligencia artificial ───────────────────────────────────────
  {
    id: 'asistente',
    nombre: 'Asistente de la clínica',
    grupo: 'Inteligencia',
    icono: 'chispa',
    estado: 'planeado',
    resumen:
      'Atiende WhatsApp con cinco herramientas y ni una más: buscar servicio, consultar disponibilidad, agendar, reagendar y escalar a humano.',
    entrega: 'E5',
    permiso: 'ai.toggle',
  },
  {
    id: 'entrenamiento',
    nombre: 'Entrenamiento del asistente',
    grupo: 'Inteligencia',
    icono: 'libro',
    estado: 'planeado',
    resumen:
      'Comportamiento, conocimiento y reglas, en tres capas separadas. El prompt vive en la base y se versiona, para poder revertirlo.',
    entrega: 'E5',
    permiso: 'ai.configure',
  },
  {
    id: 'copiloto',
    nombre: 'Copiloto interno',
    grupo: 'Inteligencia',
    icono: 'brujula',
    estado: 'planeado',
    resumen:
      '"¿Cuántas cirugías hay mañana?", "¿qué facturas vencen?". Las herramientas disponibles dependen del rol de quien pregunta.',
    entrega: null,
  },

  // ── Comercial ─────────────────────────────────────────────────────
  {
    id: 'leads',
    nombre: 'Leads y comercial',
    grupo: 'Comercial',
    icono: 'embudo',
    estado: 'planeado',
    resumen: 'De dónde vino, qué le interesa, qué se le cotizó y si volvió. Conectado al paciente, no separado.',
    entrega: 'E4',
    permiso: 'lead.read',
  },
  {
    id: 'empresas',
    nombre: 'Campañas empresariales',
    grupo: 'Comercial',
    icono: 'edificio',
    estado: 'planeado',
    resumen: 'Jornadas de tamizaje en empresas: contactos, fechas, asistentes e informes de salud ocupacional.',
    entrega: null,
  },
  {
    id: 'optica',
    nombre: 'Óptica y punto de venta',
    grupo: 'Comercial',
    icono: 'gafas',
    estado: 'planeado',
    resumen: 'Fórmulas, monturas, lentes, órdenes a laboratorio, entrega y garantías, dentro del mismo Paciente 360°.',
    entrega: null,
  },

  // ── Dinero ────────────────────────────────────────────────────────
  {
    id: 'facturacion',
    nombre: 'Facturación',
    grupo: 'Dinero',
    icono: 'factura',
    estado: 'planeado',
    resumen:
      'Cotización, factura, pago y caja. La emisión electrónica DIAN y los RIPS se delegan en un proveedor autorizado, no se construyen.',
    entrega: null,
  },
  {
    id: 'cartera',
    nombre: 'Cartera y tesorería',
    grupo: 'Dinero',
    icono: 'moneda',
    estado: 'planeado',
    resumen: 'Cartera por edad, aseguradores, glosas, recaudo diario y conciliación.',
    entrega: null,
  },
  {
    id: 'inventario',
    nombre: 'Inventario y compras',
    grupo: 'Dinero',
    icono: 'caja',
    estado: 'planeado',
    resumen: 'Insumos, material quirúrgico y lentes por sede, con lotes, vencimientos y mínimos.',
    entrega: null,
  },
  {
    id: 'indicadores',
    nombre: 'Indicadores',
    grupo: 'Dinero',
    icono: 'grafico',
    estado: 'planeado',
    resumen:
      'Ocupación, no-show, conversión, ticket promedio y rentabilidad. Se resolverá con Metabase sobre la misma base, no con código propio.',
    entrega: null,
  },

  // ── Recursos ──────────────────────────────────────────────────────
  {
    id: 'catalogo',
    nombre: 'Catálogo y sedes',
    grupo: 'Recursos',
    icono: 'lista',
    estado: 'disponible',
    resumen: 'Los servicios de la clínica, sus duraciones, requisitos y las sedes donde se prestan.',
    entrega: 'E1',
    permiso: 'service.read',
  },
  {
    id: 'profesionales',
    nombre: 'Profesionales y horarios',
    grupo: 'Recursos',
    icono: 'bata',
    estado: 'construccion',
    resumen: 'Quién atiende qué, en qué sede y en qué franja. Es lo que la agenda necesita para existir.',
    entrega: 'E1',
    permiso: 'schedule.manage',
  },
  {
    id: 'talento',
    nombre: 'Talento humano',
    grupo: 'Recursos',
    icono: 'equipo',
    estado: 'planeado',
    resumen: 'Contratos, turnos, permisos, incapacidades y vencimientos documentales.',
    entrega: null,
  },
  {
    id: 'documentos',
    nombre: 'Documentos',
    grupo: 'Recursos',
    icono: 'carpeta',
    estado: 'planeado',
    resumen: 'Órdenes, autorizaciones y resultados, clasificados y con permisos por documento.',
    entrega: null,
  },
  {
    id: 'automatizaciones',
    nombre: 'Automatizaciones',
    grupo: 'Recursos',
    icono: 'engranaje',
    estado: 'planeado',
    resumen:
      'Cuando ocurra X, ejecutar Y. Las reglas vivirán en código hasta que existan diez reales; un motor configurable antes de eso es una trampa.',
    entrega: null,
  },

  // ── Sistema ───────────────────────────────────────────────────────
  {
    id: 'canales',
    nombre: 'Líneas de WhatsApp',
    grupo: 'Sistema',
    icono: 'chat',
    estado: 'disponible',
    resumen: 'Vincular el número por QR y vigilar el estado de la sesión.',
    entrega: 'E2',
    permiso: 'whatsapp.manage',
  },
  {
    id: 'usuarios',
    nombre: 'Usuarios y permisos',
    grupo: 'Sistema',
    icono: 'llave',
    estado: 'construccion',
    resumen: 'Nueve roles con permisos por acción, y acceso por sede. El servidor ya los aplica; falta la pantalla.',
    entrega: 'E1',
    permiso: 'user.read',
  },
  {
    id: 'auditoria',
    nombre: 'Auditoría',
    grupo: 'Sistema',
    icono: 'lupa',
    estado: 'construccion',
    resumen:
      'Quién consultó, creó, modificó o exportó. Ya se registra —incluidas las lecturas de ficha— y la base impide alterarlo.',
    entrega: 'E1',
    permiso: 'audit.read',
  },
  {
    id: 'portal',
    nombre: 'Portal del paciente',
    grupo: 'Sistema',
    icono: 'mundo',
    estado: 'planeado',
    resumen:
      'Segunda etapa, y con dudas: WhatsApp ya es la aplicación que el paciente tiene instalada y sabe usar.',
    entrega: null,
  },
];

export const GRUPOS = [
  'Operación',
  'Pacientes',
  'Inteligencia',
  'Comercial',
  'Dinero',
  'Recursos',
  'Sistema',
] as const;

export const ETIQUETA_ESTADO: Record<EstadoModulo, string> = {
  disponible: 'En uso',
  construccion: 'En construcción',
  planeado: 'Planeado',
};

export const moduloPorId = (id: string) => MODULOS.find((m) => m.id === id);
