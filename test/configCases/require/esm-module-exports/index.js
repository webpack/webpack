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
const withDefaultMjsPath = WITH_DEFAULT_MJS_PATH;
const reexportMjsPath = REEXPORT_MJS_PATH;
const wrapperFullPath = WRAPPER_FULL_PATH;
const wrapperNamedPath = WRAPPER_NAMED_PATH;
const wrapperPropPath = WRAPPER_PROP_PATH;
const distinctMjsPath = DISTINCT_MJS_PATH;
const underscoreLikePath = UNDERSCORE_LIKE_PATH;

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

it("should let 'module.exports' win over a sibling default/named export", () => {
	const webpacked = require("./with-default.mjs");
	const native = require(/* webpackIgnore: true */ withDefaultMjsPath);
	expect(webpacked).toBe("module-exports-wins");
	expect(webpacked).toBe(native);
	// The default and named exports are not visible on the unwrapped value
	// (it's a string primitive here).
	expect(webpacked.default).toBeUndefined();
	expect(webpacked.named).toBeUndefined();
});

it("should unwrap 'module.exports' that was re-exported from another module", () => {
	const webpacked = require("./reexport.mjs");
	const native = require(/* webpackIgnore: true */ reexportMjsPath);
	expect(webpacked).toBe("from-base-module");
	expect(webpacked).toBe(native);
});

it("CJS wrapper `module.exports = require(esm)` re-exports the unwrapped value", () => {
	const webpacked = require("./wrapper-full.cjs");
	const native = require(/* webpackIgnore: true */ wrapperFullPath);
	expect(typeof webpacked).toBe("function");
	expect(webpacked()).toBe(42);
	expect(webpacked()).toBe(native());
	expect(webpacked.named).toBe(native.named);
});

it("CJS wrapper `module.exports.x = require(esm)` exposes the unwrapped value as a property", () => {
	const webpacked = require("./wrapper-named.cjs");
	const native = require(/* webpackIgnore: true */ wrapperNamedPath);
	expect(typeof webpacked.fn).toBe("function");
	expect(webpacked.fn()).toBe(42);
	expect(webpacked.fn()).toBe(native.fn());
	expect(webpacked.literal).toBe("i-am-the-module-exports");
	expect(webpacked.literal).toBe(native.literal);
});

it("CJS wrapper `module.exports = require(esm).x` re-exports a property of the unwrapped value", () => {
	const webpacked = require("./wrapper-prop.cjs");
	const native = require(/* webpackIgnore: true */ wrapperPropPath);
	expect(webpacked).toBe("named-prop");
	expect(webpacked).toBe(native);
});

it("should not leak sibling named exports when 'module.exports' unwraps (usedExports regression)", () => {
	// `"module.exports"` and `named` are bound to *different* values. With
	// `usedExports: true`, webpack must mark `"module.exports"` referenced
	// for property-access requires; otherwise `getUsedName` chicken-and-eggs
	// itself and webpack falls back to `__webpack_require__(id).named`,
	// returning "named-value" — which would NOT match Node's behavior of
	// accessing `.named` on the unwrapped string (`undefined`).
	const webpackedNamed = require("./distinct.mjs").named;
	const nativeNamed = require(/* webpackIgnore: true */ distinctMjsPath).named;
	expect(webpackedNamed).toBeUndefined();
	expect(webpackedNamed).toBe(nativeNamed);

	const webpackedPlain = require("./distinct.mjs");
	const nativePlain = require(/* webpackIgnore: true */ distinctMjsPath);
	expect(webpackedPlain).toBe("module-exports-value");
	expect(webpackedPlain).toBe(nativePlain);
});

// Underscore-shaped library regression (issue #20896 + the linked underscore
// and esbuild issues): an ESM-only library that exports itself via
// `"module.exports"` must be observable from CJS as the library function,
// not as the ESM namespace.

it("Underscore-like: `const _ = require(lib)` yields the callable library", () => {
	const _ = require("./underscore-like.mjs");
	const native = require(/* webpackIgnore: true */ underscoreLikePath);
	expect(typeof _).toBe("function");
	expect(typeof native).toBe("function");
	expect(_.VERSION).toBe("1.0.0-esm");
	expect(_.VERSION).toBe(native.VERSION);
	expect(_.map([1, 2, 3], (x) => x * 2)).toEqual([2, 4, 6]);
});

it("Underscore-like: `_.partial.placeholder === _` (underscore/issues/3016)", () => {
	const _ = require("./underscore-like.mjs");
	// The library function and its default-placeholder reference must be the
	// same object. With a namespace import this strict-equality check fails
	// silently and `_.partial` stops recognising `_` as the placeholder.
	expect(_.partial.placeholder).toBe(_);
});

it("Underscore-like: `_.partial(fn, _, x, _)` fills positionally with the placeholder", () => {
	const _ = require("./underscore-like.mjs");
	const concat3 = (a, b, c) => `${a}|${b}|${c}`;
	expect(_.partial(concat3, _, "B", "C")("A")).toBe("A|B|C");
	expect(_.partial(concat3, "A", _, "C")("B")).toBe("A|B|C");
});

it("Underscore-like: destructured pull behaves as `import _ from 'underscore'` would (esbuild/issues/4459)", () => {
	const { map, VERSION } = require("./underscore-like.mjs");
	const native = require(/* webpackIgnore: true */ underscoreLikePath);
	expect(map([1, 2], (x) => x + 1)).toEqual([2, 3]);
	expect(VERSION).toBe(native.VERSION);
});

it("should preserve namespace behavior when ESM has no 'module.exports' export", () => {
	const ns = require("./no-special-export.mjs");
	const nativeNs = require(/* webpackIgnore: true */ noSpecialMjsPath);
	expect(ns.foo).toBe("foo-value");
	expect(ns.foo).toBe(nativeNs.foo);
	expect(ns.default).toBe("default-value");
	expect(ns.default).toBe(nativeNs.default);
});
