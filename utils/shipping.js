export const SHIPPING_COST = { dhaka: 80, chattogram: 70, others: 150 };

export function calcTotals(lines, zone) {
  const cost = SHIPPING_COST[zone];
  if (cost === undefined) throw new Error(`Unknown shipping zone: ${zone}`);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  return { subtotal, shippingCost: cost, total: subtotal + cost };
}
