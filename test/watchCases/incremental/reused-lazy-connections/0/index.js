import * as values from "./barrel.js";

it("should build the namespace and nested re-exports", () => {
	expect({ ...values }).toEqual({ local: "local", first: "first", second: "second" });
});
