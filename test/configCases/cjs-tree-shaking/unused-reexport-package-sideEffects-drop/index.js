import { used } from "./lib.cjs";

it("drops an unused reexport when the target package declares sideEffects: false", () => {
	expect(used).toBe("used");
	const src = String(__webpack_modules__["./lib.cjs"]);
	expect(src).toMatch(/\/\* unused reexport \*\/ 0/);
	expect(src).not.toMatch(/SEF_PKG_MARKER/);
	expect(
		Object.keys(__webpack_modules__).some((id) => /sef-pkg/.test(id))
	).toBe(false);
});
