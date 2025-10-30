import { main } from "./module.js";

it("should handle import.meta.main", async () => {
	expect(import.meta.main).toBe(true);
	expect(typeof import.meta.main).toBe("boolean");

	// Just for test, nobody uses this in real code
	await import(`./${typeof import.meta.main}.js`);

	const { main: myMain } = import.meta;
	expect(myMain).toBe(true);

	expect(main).toBe(false);
});
