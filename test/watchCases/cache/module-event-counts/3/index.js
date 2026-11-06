import value from "./value";
import plain from "./plain.js";

it("should stop reporting modules removed from the graph", () => {
	expect(value).toBe(3);
	expect(plain).toBe(0);
});
