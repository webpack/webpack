import * as values from "./barrel.js";

it("should build both re-exports", () => {
	expect({ ...values }).toEqual({ first: "first", second: "second" });
});
