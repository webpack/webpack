import * as values from "./barrel.js";

it("should honor resolution changes between rebuilds", () => {
	expect({ ...values }).toEqual({ answer: "second" });
});
