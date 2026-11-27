import assert from 'node:assert/strict';
import test from 'node:test';
import { getDateRangeError, isValidFilterDate } from '../src/utils/dateFilters.js';

test('acepta fechas ISO completas y calendariamente válidas', () => {
  assert.equal(isValidFilterDate('2026-11-27'), true);
  assert.equal(isValidFilterDate('2024-02-29'), true);
});

test('rechaza años intermedios, formatos incompletos y fechas inexistentes', () => {
  assert.equal(isValidFilterDate('0002-11-27'), false);
  assert.equal(isValidFilterDate('2026-11-2'), false);
  assert.equal(isValidFilterDate('2026-02-29'), false);
  assert.equal(isValidFilterDate('2026-13-01'), false);
});

test('distingue fechas incompletas de rangos invertidos', () => {
  assert.equal(getDateRangeError('0002-11-27', '2026-11-27'), 'incomplete');
  assert.equal(getDateRangeError('2026-11-28', '2026-11-27'), 'inverted');
  assert.equal(getDateRangeError('2026-11-01', '2026-11-27'), null);
});
