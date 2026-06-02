import { describe, it, expect, beforeEach } from "vitest";
import { addItem, getCart, setQty, removeItem, cartTotal, clearCart } from "../lib/cart.js";

describe("cart", () => {
  beforeEach(() => localStorage.clear());
  it("adds and totals", () => {
    addItem({ id: 1, price: "5000", name_uz: "a" });
    addItem({ id: 1, price: "5000", name_uz: "a" });
    addItem({ id: 2, price: "3000", name_uz: "b" });
    expect(getCart().find(i => i.id === 1).qty).toBe(2);
    expect(cartTotal()).toBe(13000);
  });
  it("setQty and remove", () => {
    addItem({ id: 1, price: "5000" });
    setQty(1, 5);
    expect(getCart()[0].qty).toBe(5);
    removeItem(1);
    expect(getCart()).toHaveLength(0);
  });
  it("clears", () => { addItem({ id: 1, price: "1" }); clearCart(); expect(getCart()).toHaveLength(0); });
});
