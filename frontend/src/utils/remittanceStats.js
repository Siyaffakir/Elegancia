// utils/remittanceStats.js — derives "who owes what" from orders + the remittance ledger,
// all data the Admin Studio already has loaded (no extra endpoint needed beyond the small
// agencies/remittances lists).
export const REMITTANCE_ELIGIBLE_STATUSES = new Set(['Confirmed', 'Shipped', 'Delivered']);

export function orderSubtotal(order) {
  return (order.items || []).reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);
}

/** Set of order ids already covered by some remittance ledger entry (i.e. paid out). */
export function paidOrderIdSet(remittances) {
  const set = new Set();
  (remittances || []).forEach((r) => (r.order_ids || []).forEach((id) => set.add(id)));
  return set;
}

/** Per-agency rollup: orders handled, returns, amount still owed, amount already received. */
export function computeAgencyStats(orders, agencies, remittances) {
  const paidIds = paidOrderIdSet(remittances);

  const receivedByAgency = new Map();
  (remittances || []).forEach((r) => {
    receivedByAgency.set(r.agency_id, (receivedByAgency.get(r.agency_id) || 0) + r.amount);
  });

  return (agencies || []).map((agency) => {
    const agencyOrders = (orders || []).filter((o) => o.delivery_agency_id === agency.id);
    const eligible = agencyOrders.filter((o) => REMITTANCE_ELIGIBLE_STATUSES.has(o.status));
    const pending = eligible.filter((o) => !paidIds.has(o.id));
    const returned = agencyOrders.filter((o) => o.status === 'Returned');

    const pendingAmount = pending.reduce((sum, o) => sum + orderSubtotal(o), 0);
    const receivedAmount = receivedByAgency.get(agency.id) || 0;
    const returnCost = returned.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);

    return {
      agency,
      ordersHandled: agencyOrders.length,
      returnedCount: returned.length,
      returnRate: agencyOrders.length ? returned.length / agencyOrders.length : 0,
      pendingCount: pending.length,
      pendingAmount,
      receivedAmount,
      returnCost,
      netReceived: receivedAmount - returnCost,
    };
  });
}
