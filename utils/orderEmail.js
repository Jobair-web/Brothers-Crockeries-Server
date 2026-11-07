const esc = (v = "") =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const taka = (n) => `৳${Math.round(n).toLocaleString("en-US")}`;

/** Plain-data order -> { subject, html, text }. Pure function (no I/O) so it is easy to test. */
export function orderEmail(order) {
  const b = order.billing;
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.title)} × ${i.quantity}</td><td style="text-align:right">${taka(i.price * i.quantity)}</td></tr>`)
    .join("");
  const paymentLine =
    order.paymentMethod === "bkash_nagad"
      ? "bKash / Nagad – we will verify your payment shortly."
      : "Cash on delivery – please keep the cash ready.";
  const ship = order.shipToDifferentAddress && order.shipping ? order.shipping : null;
  const addr = ship
    ? `${ship.firstName} ${ship.lastName}, ${ship.address}, ${ship.city}, ${ship.district}`
    : `${b.address}, ${b.city}, ${b.district}`;

  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#16213a">
  <h2 style="color:#0e5a7e">Thank you for your order, ${esc(b.firstName)}!</h2>
  <p>Order number: <strong>${esc(order.orderNumber)}</strong></p>
  <table style="width:100%;border-collapse:collapse">${rows}
    <tr><td style="padding:6px 0;border-top:1px solid #ddd">Shipping</td><td style="text-align:right;border-top:1px solid #ddd">${taka(order.shippingCost)}</td></tr>
    <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${taka(order.total)}</strong></td></tr>
  </table>
  <p><strong>Payment:</strong> ${paymentLine}</p>
  <p><strong>Delivery address:</strong> ${esc(addr)}</p>
  <p style="color:#666;font-size:13px">New Brothers Crockeries, Riyaz Uddin Bazar, Chattogram</p></div>`;

  const text = [
    `Thank you for your order, ${b.firstName}!`,
    `Order number: ${order.orderNumber}`,
    ...order.items.map((i) => `- ${i.title} x ${i.quantity}: ${taka(i.price * i.quantity)}`),
    `Shipping: ${taka(order.shippingCost)}`,
    `Total: ${taka(order.total)}`,
    `Payment: ${paymentLine}`,
    `Delivery address: ${addr}`,
  ].join("\n");

  return { subject: `Order ${order.orderNumber} received – Brothers Crockeries`, html, text };
}
