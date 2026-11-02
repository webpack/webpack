import * as values from "./barrel.js";

it("should rebuild a changed target while reusing its importers", () => {
	expect({ ...values }).toEqual({ local: "local", first: "first", second: "changed" });
});
