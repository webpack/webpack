import * as library from "./library.mjs";

it("should reexport the configured external targets instead of their aliases", () => {
	expect(library.value).toBe(1);
	expect(library.arrayValue).toBe(2);
	expect(library.recordValue).toBe(3);
	expect(Object.keys(library)).toEqual(["arrayValue", "recordValue", "value"]);
});
