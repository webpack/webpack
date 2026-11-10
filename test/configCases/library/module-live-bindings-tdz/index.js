import * as library from "./library.mjs";
// Another runtime runs the module too, without the library's names
import { count as ownCount, bump as ownBump } from "./tdz.js";

it("should throw where a module uses a binding above its declaration", () => {
	expect(library.errors).toEqual(["ReferenceError", "ReferenceError"]);
});

it("should keep the binding live once declared", () => {
	expect([library.count, library.read(), library.Shape.name]).toEqual([
		0,
		0,
		"Shape"
	]);
	library.bump();
	expect([library.count, library.read(), library.Shape.name]).toEqual([
		1,
		1,
		"Square"
	]);
});

it("should leave another runtime's instance of the module as it is", () => {
	expect(ownCount).toBe(0);
	ownBump();
	expect(ownCount).toBe(1);
	expect(library.count).toBe(1);
});
