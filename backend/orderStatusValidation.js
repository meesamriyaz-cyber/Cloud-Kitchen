export function duplicateStatusValidation(order, newStatus) {
  if (order?.status === newStatus) {
    return { ok: false, error: 'Order is already in this status' };
  }
  return null;
}
