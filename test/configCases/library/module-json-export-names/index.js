import * as library from "./library.mjs";

it("should export the keys of a JSON module reached through export *", () => {
	expect(library.a).toBe(2);
	expect(library.__esModule).toBe(true);
	// A name with a lone surrogate can not be exported from an ES module
	expect(Object.keys(library).sort()).toEqual(["__esModule", "a"]);
});
