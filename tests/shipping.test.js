import test from "node:test";
import assert from "node:assert/strict";
import { calcTotals, SHIPPING_COST } from "../utils/shipping.js";

test("shipping costs match the checkout design", () => {
  assert.deepEqual(SHIPPING_COST, { dhaka: 80, chattogram: 70, others: 150 });
});

test("calcTotals adds shipping to the subtotal", () => {
  const lines = [{ price: 1350, quantity: 3 }, { price: 8300, quantity: 1 }];
  assert.deepEqual(calcTotals(lines, "dhaka"), { subtotal: 12350, shippingCost: 80, total: 12430 });
});

test("calcTotals rejects unknown zones", () => {
  assert.throws(() => calcTotals([], "mars"), /Unknown shipping zone/);
});
