import * as library from "./library.mjs";

it("should preserve external and local exports through circular star reexports", () => {
	expect(library.externalValue).toBe(42);
	expect(library.localValue).toBe(1);
	expect(Object.keys(library)).toEqual(["externalValue", "localValue"]);
});
