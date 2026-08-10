import { used } from "./lib.cjs";

it("drops an unused SEF reexport when concatenateModules is enabled", () => {
	expect(used).toBe("used");
	expect("./sef.cjs" in __webpack_modules__).toBe(false);
	const src = Object.keys(__webpack_modules__)
		.map((id) => String(__webpack_modules__[id]))
		.join("\n");
	expect(src).toMatch(/\/\* unused reexport \*\/ 0/);
});
