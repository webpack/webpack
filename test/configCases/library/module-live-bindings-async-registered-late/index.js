import { bump } from "./shared.js";
import { bumpSync, then } from "./sync.js";

bump();
bumpSync();

it("should initialize late exports from a completed async module", async () => {
	const library = await import(/* webpackIgnore: true */ "./library.mjs");
	expect(library.count).toBe(2);
	expect(library.alias).toBe(2);
	expect(library.bump()).toBe(2);
	expect(library.count).toBe(3);
	expect(library.alias).toBe(3);
});

it("should initialize synchronous exports alongside async exports", async () => {
	const library = await import(/* webpackIgnore: true */ "./library.mjs");
	expect(typeof then).toBe("function");
	expect(library.syncCount).toBe(11);
	library.bumpSync();
	expect(library.syncCount).toBe(12);
});
