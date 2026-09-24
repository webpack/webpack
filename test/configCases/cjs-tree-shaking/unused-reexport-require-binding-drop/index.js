import { used, part, partA } from "./lib.cjs";

const libSource = () => String(__webpack_modules__["./lib.cjs"]);

it("drops a side-effect-free module whose require binding is only re-exported unused", () => {
	expect(used).toBe("used");
	expect("./sef.cjs" in __webpack_modules__).toBe(false);
	const src = libSource();
	expect(src).not.toMatch(/sef\.cjs/);
	expect(src).toMatch(/const sef = 0;/);
	expect((src.match(/\/\* unused reexport \*\/ 0;/g) || []).length).toBe(4);
});

it("keeps only the exports read through a re-exported require binding", () => {
	expect(partA).toBe("a");
	expect(part.b).toBe("b");
	expect(part.usedExports).toEqual(["a", "b", "usedExports"]);
	expect(String(__webpack_modules__["./part.cjs"])).not.toMatch(
		/exports\.c\b/
	);
});

it("keeps the side effects of a module whose require binding is re-exported unused", () => {
	expect(global.__cjs_binding_effect_ran).toBe(true);
	delete global.__cjs_binding_effect_ran;
	const src = String(__webpack_modules__["./effect.cjs"]);
	expect(src).not.toMatch(/exports\.value/);
	expect(src).toMatch(/__webpack_unused_export__ = \[\];/);
	expect(libSource()).not.toMatch(/exports\.effect/);
});
