import * as values from "./barrel.js";

it("should keep the re-exports after the third edit", () => {
	expect({ ...values }).toEqual({ first: "first", second: "second" });
});
