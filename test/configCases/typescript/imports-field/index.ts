import val1 from "#internal/module";
import val2 from "#internal-other/module.ts";
import val3 from "#internal-other/module.js";

it("should work", () => {
	expect(val1).toBe(42);
	expect(val2).toBe(42);
	expect(val3).toBe(42);
});
