import { main } from "./module.js";
import { bare, direct, destructured } from "./module.mjs";

it("should handle import.meta.main", async () => {
	expect(import.meta.main).toBe(true);
	expect(typeof import.meta.main).toBe("boolean");

	// Just for test, nobody uses this in real code
	await import(`./${typeof import.meta.main}.js`);

	const { main: myMain } = import.meta;
	expect(myMain).toBe(true);

	expect(main).toBe(false);
});

it("should be false in a strict harmony module that is not the entry", () => {
	expect(bare).toBe(false);
	expect(direct).toBe(false);
	expect(destructured).toBe(false);
});
