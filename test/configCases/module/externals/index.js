import imported from "./imported.mjs";
import value from "./module";

it("should allow to use externals in concatenated modules", () => {
	expect(imported).toBe(42);
	expect(value).toBe(40);
});
