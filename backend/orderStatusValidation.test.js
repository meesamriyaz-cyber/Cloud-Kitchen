import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateStatusValidation } from './orderStatusValidation.js';

test('rejects a repeated delivered status so it cannot trigger delivery payment side effects', () => {
  const result = duplicateStatusValidation(
    { status: 'delivered', payment_status: 'pending', payment_method: 'cash' },
    'delivered',
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'Order is already in this status',
  });
});

test('does not reject a genuine status change', () => {
  assert.equal(duplicateStatusValidation({ status: 'out_for_delivery' }, 'delivered'), null);
});
