import test from 'node:test';
import assert from 'node:assert/strict';

import { getFechaLocalActual, isFechaVencimientoValida } from './fechaVencimiento.js';

const hoy = new Date(2026, 10, 25, 12, 0, 0);

test('getFechaLocalActual devuelve YYYY-MM-DD en hora local', () => {
  assert.equal(getFechaLocalActual(hoy), '2026-11-25');
});

test('una fecha anterior a hoy es vencida', () => {
  assert.equal(isFechaVencimientoValida('2026-11-24', hoy), false);
});

test('la fecha de hoy es válida', () => {
  assert.equal(isFechaVencimientoValida('2026-11-25', hoy), true);
});

test('una fecha futura es válida', () => {
  assert.equal(isFechaVencimientoValida('2026-11-26', hoy), true);
});
