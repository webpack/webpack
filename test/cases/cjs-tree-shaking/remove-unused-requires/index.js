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

if (process.env.NODE_ENV === "production") {
	it("drops a bare require of a side-effect-free module", () => {
		expect(require.resolveWeak("./pure?bare")).toBe(null);
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
}
