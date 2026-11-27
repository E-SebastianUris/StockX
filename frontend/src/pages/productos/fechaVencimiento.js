export function getFechaLocalActual(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function isFechaVencimientoValida(fechaVencimiento, fechaActual = new Date()) {
  if (!fechaVencimiento) return true;

  const hoy = getFechaLocalActual(fechaActual);
  return /^\d{4}-\d{2}-\d{2}$/.test(fechaVencimiento)
    && fechaVencimiento >= hoy;
}
