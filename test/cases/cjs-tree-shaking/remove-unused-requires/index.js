const { keep } = require("./sibling-lib");

// Bare require: result discarded, target side-effect free.
require("./pure?bare");

// Unused binding to a side-effect-free module.
const deadBinding = require("./pure?binding");

// Empty destructure: no members read.
const {} = require("./pure?destructure");

// Conditional bare require with an unknown condition.
if (global.__unknown_cond) require("./pure?cond");

// Used require must stay (control).
const { unused: used } = require("./pure?used");

// Side-effectful bare require must stay.
global.__cjs_effect_ran = false;
require("./effect");

// Statement-level conditional require: must not rewrite the shared valueRange to "0".
require(global.__pick_ternary ? "./pure?ternary-a" : "./pure?ternary-b");

global.__cjs_ternary_effect_ran = false;
require(
	global.__pick_ternary_effect ? "./effect-ternary" : "./pure?ternary-c"
);

// Parenthesized / `new` callee: header must stay paired with the require dep.
(require)("./pure?paren");
new require("./pure?new");

it("keeps a sibling declarator when an unused require shares its declaration", () => {
	expect(keep).toBe("kept");
});

it("keeps a used require binding", () => {
	expect(used).toBe("unused");
});

it("keeps a bare require to a side-effectful module", () => {
	expect(global.__cjs_effect_ran).toBe(true);
	delete global.__cjs_effect_ran;
});

it("runs the effect branch of a statement-level conditional require", () => {
	global.__pick_ternary_effect = true;
	global.__cjs_ternary_effect_ran = false;
	require(
		global.__pick_ternary_effect ? "./effect-ternary" : "./pure?ternary-c"
	);
	expect(global.__cjs_ternary_effect_ran).toBe(true);
	delete global.__pick_ternary_effect;
	delete global.__cjs_ternary_effect_ran;
});

if (process.env.NODE_ENV === "production") {
	const bundledSource = () =>
		Object.keys(__webpack_modules__)
			.map((id) => String(__webpack_modules__[id]))
			.join("\n");

	it("drops a bare require of a side-effect-free module", () => {
		expect(require.resolveWeak("./pure?bare")).toBe(null);
		expect(bundledSource()).toMatch(/\b0;/);
	});

	it("drops an unused require binding of a side-effect-free module", () => {
		expect(require.resolveWeak("./pure?binding")).toBe(null);
	});

	it("drops an unused require that shares a declaration with a kept binding", () => {
		expect(require.resolveWeak("./pure?sibling")).toBe(null);
	});

	it("drops an empty destructuring require of a side-effect-free module", () => {
		expect(require.resolveWeak("./pure?destructure")).toBe(null);
	});

	it("drops a conditional bare require of a side-effect-free module", () => {
		expect(require.resolveWeak("./pure?cond")).toBe(null);
	});

	it("keeps a used require of a side-effect-free module", () => {
		expect(require.resolveWeak("./pure?used")).not.toBe(null);
	});

	it("keeps a bare require of a side-effectful module in the graph", () => {
		expect(require.resolveWeak("./effect")).not.toBe(null);
	});

	it("keeps both sides of a statement-level ternary require", () => {
		expect(require.resolveWeak("./pure?ternary-a")).not.toBe(null);
		expect(require.resolveWeak("./pure?ternary-b")).not.toBe(null);
		expect(bundledSource()).not.toMatch(/\b00;/);
	});

	it("drops parenthesized and new require of side-effect-free modules", () => {
		expect(require.resolveWeak("./pure?paren")).toBe(null);
		expect(require.resolveWeak("./pure?new")).toBe(null);
	});
}
