import * as library from "./library.mjs";

it("should reexport the external without a property path", () => {
	expect(library.value).toBe(1);
	expect(Object.keys(library)).toEqual(["value"]);
});
