import test from "node:test";
import assert from "node:assert/strict";
import { orderEmail } from "../utils/orderEmail.js";

const order = {
  orderNumber: "BC-TEST123",
  items: [{ title: "Rice <Cooker> 1.8L", price: 3450, quantity: 2 }],
  billing: { firstName: "Nusrat", lastName: "Jahan", address: "House 5", city: "Agrabad", district: "Chattogram" },
  shippingCost: 70,
  total: 6970,
  paymentMethod: "bkash_nagad",
};

test("email contains order number, totals and escapes html in titles", () => {
  const { subject, html, text } = orderEmail(order);
  assert.match(subject, /BC-TEST123/);
  assert.match(html, /৳6,970/);
  assert.ok(!html.includes("<Cooker>"));
  assert.match(text, /Rice <Cooker> 1.8L x 2/);
});

test("uses the separate shipping address when present", () => {
  const { text } = orderEmail({
    ...order,
    shipToDifferentAddress: true,
    shipping: { firstName: "Rina", lastName: "Akter", address: "Road 9", city: "Dhanmondi", district: "Dhaka" },
  });
  assert.match(text, /Rina Akter, Road 9, Dhanmondi, Dhaka/);
});
