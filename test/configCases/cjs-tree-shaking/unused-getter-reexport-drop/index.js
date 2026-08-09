import { used } from "./lib.cjs";

it("drops a module behind an unused getter reexport even with side effects", () => {
	expect(used).toBe("used");
	expect("./heavy.cjs" in __webpack_modules__).toBe(false);
	expect(global.__cjs_unused_getter_heavy_ran).toBe(undefined);
});
