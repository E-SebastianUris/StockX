export function isValidFilterDate(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return false;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaNormalizada = new Date(Date.UTC(anio, mes - 1, dia));
  return anio >= 1000
    && fechaNormalizada.getUTCFullYear() === anio
    && fechaNormalizada.getUTCMonth() === mes - 1
    && fechaNormalizada.getUTCDate() === dia;
}

export function getDateRangeError(fechaDesde, fechaHasta) {
  if ((fechaDesde && !isValidFilterDate(fechaDesde)) || (fechaHasta && !isValidFilterDate(fechaHasta))) {
    return 'incomplete';
  }

  if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
    return 'inverted';
  }

  return null;
}
