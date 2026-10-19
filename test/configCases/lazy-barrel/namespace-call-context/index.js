import * as namespace from "./barrel.js";

it("should preserve reexports read through the namespace call context", () => {
	expect(namespace.readOther()).toBe(42);
});
