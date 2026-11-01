import "./setup";
import "./var-rebound-exports";
import "./block-var-rebound-exports";
import "./shadowed-module";
import "./replaced-through-variable";
import "./replaced-computed-member";
import "./replaced-in-chain";
import "./value-computed-object-key";
import "./value-array-spread";
import "./umd";
import "./pure-module-exports-array";
import "./pure-chained-module-exports";
import "./pure-declaration-chain";
import hoisted from "./hoisted-var-exports";

const bundled = (name) => `./${name}.js` in __webpack_modules__;

it("should keep a write through a rebound exports binding", () => {
	expect(global.cjsVarReboundMarker).toBe(true);
	expect(global.cjsBlockVarReboundMarker).toBe(true);
	expect(bundled("var-rebound-exports")).toBe(true);
	expect(bundled("block-var-rebound-exports")).toBe(true);
});

it("should write the exports object before a hoisted var exports rebinds it", () => {
	expect(hoisted.hoisted).toBe(1);
	expect(hoisted.other).toBe(undefined);
});

it("should keep a definition on a shadowed or replaced module.exports", () => {
	expect(global.cjsShadowedModuleMarker).toBe(true);
	expect(global.cjsReplacedVariableMarker).toBe(true);
	expect(global.cjsReplacedComputedMarker).toBe(true);
	expect(global.cjsReplacedChainMarker).toBe(true);
	const kept = [
		"shadowed-module",
		"replaced-through-variable",
		"replaced-computed-member",
		"replaced-in-chain"
	];
	expect(kept.filter((name) => !bundled(name))).toEqual([]);
});

it("should evaluate an assigned value that runs user code", () => {
	const expected = ["value-computed-object-key", "value-array-spread", "umd"];
	expect(expected.filter((name) => !global.cjsEffects.includes(name))).toEqual(
		[]
	);
	expect(expected.filter((name) => !bundled(name))).toEqual([]);
});

it("should drop a module whose writes and values run no user code", () => {
	const dropped = [
		"pure-module-exports-array",
		"pure-chained-module-exports",
		"pure-declaration-chain"
	];
	expect(dropped.filter(bundled)).toEqual([]);
	delete global.cjsEffects;
	delete global.cjsVarReboundMarker;
	delete global.cjsBlockVarReboundMarker;
	delete global.cjsShadowedModuleMarker;
	delete global.cjsReplacedVariableMarker;
	delete global.cjsReplacedComputedMarker;
	delete global.cjsReplacedChainMarker;
});
