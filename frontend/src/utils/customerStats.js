// utils/customerStats.js — aggregates customer return history from the orders already
// loaded in the Admin Studio. Phone number is the grouping key (more stable than name,
// which customers spell inconsistently across orders); no separate backend endpoint is
// needed since admin already fetches every order.
export function computeCustomerStats(orders) {
  const byPhone = new Map();

  (orders || []).forEach((o) => {
    const phone = String(o.phone || '').trim();
    if (!phone) return;

    if (!byPhone.has(phone)) {
      byPhone.set(phone, {
        phone,
        names: new Set(),
        totalOrders: 0,
        returnedCount: 0,
        canceledCount: 0,
        deliveredCount: 0,
        totalSpent: 0,
        lastOrderAt: o.created_at,
      });
    }

    const entry = byPhone.get(phone);
    entry.totalOrders += 1;
    if (o.full_name) entry.names.add(o.full_name);
    if (o.status === 'Returned') entry.returnedCount += 1;
    if (o.status === 'Canceled') entry.canceledCount += 1;
    if (o.status === 'Delivered') {
      entry.deliveredCount += 1;
      entry.totalSpent += o.total_price || 0;
    }
    if (!entry.lastOrderAt || (o.created_at && o.created_at > entry.lastOrderAt)) {
      entry.lastOrderAt = o.created_at;
    }
  });

  return Array.from(byPhone.values()).map((entry) => ({
    ...entry,
    names: Array.from(entry.names),
    returnRate: entry.totalOrders ? entry.returnedCount / entry.totalOrders : 0,
  }));
}

/** Map of phone -> aggregate stats, for O(1) lookups when flagging a single order row. */
export function customerStatsByPhone(orders) {
  const list = computeCustomerStats(orders);
  return new Map(list.map((c) => [c.phone, c]));
}
