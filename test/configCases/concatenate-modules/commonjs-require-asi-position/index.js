import { order } from "./side-effects";

it("should keep adjacent bare requires as separate statements", () => {
	expect(order).toEqual(["a", "b"]);
});
