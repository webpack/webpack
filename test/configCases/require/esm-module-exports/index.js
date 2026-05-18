// Verify webpack's `require(esm)` "module.exports" unwrapping matches Node's
// native `require(esm)` (https://nodejs.org/docs/latest/api/modules.html#loading-ecmascript-modules-using-require).
//
// Each `.mjs` fixture is required two ways:
//   * `require("./*.mjs")` — webpack rewrites the call, and (with this PR)
//     unwraps the `"module.exports"` named export at code-gen time.
//   * `require(/* webpackIgnore: true */ pathVar)` — webpack leaves the call
//     literal. At runtime the test harness short-circuits these absolute
//     paths via `testConfig.modules` (see `test.config.js`) to the values
//     produced by Node's real `Module._load` — the native `require(esm)`
//     result.
//
// Both sides must agree.

const valueMjsPath = VALUE_MJS_PATH;
const plainMjsPath = PLAIN_MJS_PATH;
const noSpecialMjsPath = NO_SPECIAL_MJS_PATH;

it("should unwrap a named export 'module.exports' for plain require()", () => {
	const webpacked = require("./value.mjs");
	const native = require(/* webpackIgnore: true */ valueMjsPath);
	expect(typeof webpacked).toBe("function");
	expect(typeof native).toBe("function");
	expect(webpacked()).toBe(42);
	expect(webpacked()).toBe(native());
	expect(webpacked.named).toBe("named-prop");
	expect(webpacked.named).toBe(native.named);
});

it("should unwrap 'module.exports' for require() with property access", () => {
	const native = require(/* webpackIgnore: true */ valueMjsPath);
	expect(require("./value.mjs").named).toBe(native.named);
	expect(require("./value.mjs").deep.nested).toBe(native.deep.nested);
});

it("should unwrap 'module.exports' for require() with call", () => {
	const native = require(/* webpackIgnore: true */ valueMjsPath);
	expect(require("./value.mjs")()).toBe(native());
});

it("should unwrap 'module.exports' for destructuring assignment", () => {
	const native = require(/* webpackIgnore: true */ valueMjsPath);
	const { named } = require("./value.mjs");
	expect(named).toBe(native.named);
});

it("should unwrap 'module.exports' when it is a primitive", () => {
	const webpacked = require("./plain.mjs");
	const native = require(/* webpackIgnore: true */ plainMjsPath);
	expect(webpacked).toBe("i-am-the-module-exports");
	expect(webpacked).toBe(native);
});

it("should preserve namespace behavior when ESM has no 'module.exports' export", () => {
	const ns = require("./no-special-export.mjs");
	const nativeNs = require(/* webpackIgnore: true */ noSpecialMjsPath);
	expect(ns.foo).toBe("foo-value");
	expect(ns.foo).toBe(nativeNs.foo);
	expect(ns.default).toBe("default-value");
	expect(ns.default).toBe(nativeNs.default);
});
