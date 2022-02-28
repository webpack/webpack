import * as values from "./a.js";

it("imports should have correct order", () => {
	expect(Object.keys(values)).toEqual(["A", "W", "_12", "a"])
});
