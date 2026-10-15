import { order } from "dep/order.js";

export { a, b } from "dep";

it("should concatenate re-exported side-effect-free modules in source order", () => {
	expect(order).toEqual(["a", "b"]);
});
