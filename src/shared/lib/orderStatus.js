export const OS_STATUS = {
  PROGRAMADO: 'programado',
  EN_PROGRESO: 'en_progreso',
  FINALIZADO: 'finalizado',
  CANCELADO: 'cancelado',
};

export const OS_STATUS_STEPS = [
  { key: OS_STATUS.PROGRAMADO, label: 'Programado', color: '#5A7B2E' },
  { key: OS_STATUS.EN_PROGRESO, label: 'En progreso', color: '#B8741F' },
  { key: OS_STATUS.FINALIZADO, label: 'Finalizado', color: '#2D6B45' },
  { key: OS_STATUS.CANCELADO, label: 'Cancelado', color: '#9F2D2D' },
];

const STATUS_BY_KEY = Object.fromEntries(OS_STATUS_STEPS.map(status => [status.key, status]));
const VALID_STATUS = new Set(OS_STATUS_STEPS.map(status => status.key));

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function statusFromLegacyEstado(estado) {
  if (!estado) return OS_STATUS.PROGRAMADO;

  const name = normalizeText(estado.nombre);
  if (name.includes('cancel')) return OS_STATUS.CANCELADO;
  if (estado.esFinal || name.includes('final') || name.includes('complet') || name.includes('culmin')) {
    return OS_STATUS.FINALIZADO;
  }
  if (name.includes('progreso') || name.includes('inici') || name.includes('proceso')) {
    return OS_STATUS.EN_PROGRESO;
  }
  return OS_STATUS.PROGRAMADO;
}

export function normalizeOrderStatus(order, estados = []) {
  if (VALID_STATUS.has(order?.estado)) return order.estado;
  const legacyEstado = estados.find(estado => estado.id === order?.estadoId);
  return statusFromLegacyEstado(legacyEstado);
}

export function getOrderStatusMeta(statusOrOrder, estados = []) {
  const status = typeof statusOrOrder === 'string'
    ? statusOrOrder
    : normalizeOrderStatus(statusOrOrder, estados);
  return STATUS_BY_KEY[status] || STATUS_BY_KEY[OS_STATUS.PROGRAMADO];
}

export function isOrderFinalized(orderOrStatus, estados = []) {
  const status = typeof orderOrStatus === 'string'
    ? orderOrStatus
    : normalizeOrderStatus(orderOrStatus, estados);
  return status === OS_STATUS.FINALIZADO;
}

export function isOrderClosed(orderOrStatus, estados = []) {
  const status = typeof orderOrStatus === 'string'
    ? orderOrStatus
    : normalizeOrderStatus(orderOrStatus, estados);
  return status === OS_STATUS.FINALIZADO || status === OS_STATUS.CANCELADO;
}
