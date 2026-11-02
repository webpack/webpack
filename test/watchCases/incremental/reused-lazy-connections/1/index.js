import * as values from "./barrel.js";

it("should reuse unchanged namespace targets after an importer edit", () => {
	expect({ ...values }).toEqual({ local: "local", first: "first", second: "second" });
});
