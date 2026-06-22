import { PI, NAME } from "./constants.js";

const fs = __non_webpack_require__("fs");
const source = /** @type {string} */ (fs.readFileSync(__filename, "utf-8"));

it("should inline the constants as literals", () => {
	expect(PI).toBe(3.14);
	expect(NAME).toBe("lib");
});

it("should keep the side-effectful module", () => {
	expect(globalThis.__sideEffectRan).toBe("constants.js");
	// still required for its side effect
	expect(source).toMatch(/\(\s*"\.\/constants\.js"\s*\)/);
});

it("should not ship a dead import var binding after minification", () => {
	// the require result for the inlined module is never assigned to a variable:
	// every read became a literal, so the import var is dead and the minifier drops it.
	expect(source).not.toMatch(/=\s*[\w$.]*\(\s*"\.\/constants\.js"\s*\)/);
});
