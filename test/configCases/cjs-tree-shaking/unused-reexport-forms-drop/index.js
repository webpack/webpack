import { used } from "./lib.cjs";

it("drops unused nested, defineProperty-value, and ids reexports of a SEF module", () => {
	expect(used).toBe("used");
	expect("./sef.cjs" in __webpack_modules__).toBe(false);
	const src = String(__webpack_modules__["./lib.cjs"]);
	expect(src).not.toMatch(/SEF_MARKER/);
	expect((src.match(/\/\* unused reexport \*\/ 0/g) || []).length).toBe(3);
});
