import * as values from "./barrel.js";

it("should resolve the original request", () => {
	expect({ ...values }).toEqual({ answer: "first" });
});
