import "flag-true/pure";
import "flag-list/listed";
import "flag-list/unlisted";
import "flag-false/impure";
import "./rule-side-effects";
import "./pure-dynamic";
import "./pure-extension.cjs";
import "./strict-esm.mjs";
import "./plain";

const bundled = (name) =>
	Object.keys(__webpack_modules__).some((id) => id.endsWith(name));

it("should keep a pure module whose package or rule declares side effects", () => {
	expect(bundled("flag-true/pure.js")).toBe(true);
	expect(bundled("flag-list/listed.js")).toBe(true);
	expect(bundled("rule-side-effects.js")).toBe(true);
});

it("should keep a module whose `exports` is not the CommonJS binding", () => {
	expect(bundled("strict-esm.mjs")).toBe(true);
});

it("should drop a pure module only when its source is analysed", () => {
	const analysed = ["pure-dynamic.js", "pure-extension.cjs", "plain.js"];
	expect(analysed.filter(bundled)).toEqual(ANALYSED ? [] : analysed);
});

it("should trust a package's side-effect flags while side effects are optimized", () => {
	expect(bundled("flag-list/unlisted.js")).toBe(!OPTIMIZED);
	expect(bundled("flag-false/impure.js")).toBe(!OPTIMIZED);
});
