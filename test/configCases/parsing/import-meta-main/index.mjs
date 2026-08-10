import { main } from "./module.js";
import { bare, direct, destructured } from "./module.mjs";

it("should handle import.meta.main in a strict harmony entry", () => {
	expect(import.meta.main).toBe(true);
	expect(Object(import.meta).main).toBe(true);

	const { main: myMain } = import.meta;
	expect(myMain).toBe(true);

	expect(main).toBe(false);
	expect(bare).toBe(false);
	expect(direct).toBe(false);
	expect(destructured).toBe(false);
});
