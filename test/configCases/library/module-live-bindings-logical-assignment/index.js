import * as library from "./library.mjs";

it("should keep a binding a logical assignment names live", () => {
	expect([library.callable, library.fallback]).toEqual([null, 0]);
	library.replace();
	expect([library.callable.name, library.fallback.name]).toEqual([
		"callable",
		"fallback"
	]);
});
