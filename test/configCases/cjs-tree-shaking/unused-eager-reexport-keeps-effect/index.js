import { used } from "./lib.cjs";

it("keeps evaluating a side-effectful module behind an unused eager reexport", () => {
	expect(used).toBe("used");
	expect("./effect.cjs" in __webpack_modules__).toBe(true);
	expect(global.__cjs_unused_eager_effect_ran).toBe(true);
	delete global.__cjs_unused_eager_effect_ran;
});
