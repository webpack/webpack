import { bump } from "./shared.js";

// The module runs and writes before the library registers its setters
bump();

it("should start from what a module that already ran holds", async () => {
	const library = await import(/* webpackIgnore: true */ "./library.mjs");
	expect(library.shared).toBe(2);
	library.bump();
	expect(library.shared).toBe(3);
});
