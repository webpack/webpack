import foo, { named } from "./lib";

// The bug we are testing is purely about static analysis: webpack's
// HarmonyDetectionParserPlugin was skipping the arguments of `define`
// calls in ES modules, so import bindings used inside the callback
// were not rewritten to their imported references.
//
// To exercise the rewriting we need to actually call `define(...)` so
// the parser's call hook fires and walks the argument expressions. We
// briefly install a no-op `define` on the realm's global, capture the
// callbacks via assignment-in-argument, then remove `define` again so
// other tests in the suite still see it as undefined. The
// `Function("return this")()` polyfill is used in place of `globalThis`
// for Node 10 compatibility.
var __globalThis = Function("return this")();
var __hadDefine = Object.prototype.hasOwnProperty.call(__globalThis, "define");
var __previousDefine = __globalThis.define;
__globalThis.define = function () {};

var cbDefault;
var cbNamed;
var cbBoth;

define((cbDefault = function () {
	return foo;
}));

define((cbNamed = function () {
	return named;
}));

define("named-module", ["./lib"], (cbBoth = function (lib) {
	// Reference both the AMD-style argument and the harmony import binding.
	return [foo, named, lib && lib.default];
}));

if (__hadDefine) {
	__globalThis.define = __previousDefine;
} else {
	delete __globalThis.define;
}

it("should link default import binding inside `define` callback (issue #17063)", function () {
	expect(cbDefault()).toBe(42);
});

it("should link named import binding inside `define` callback (issue #17063)", function () {
	expect(cbNamed()).toBe("named-value");
});

it("should link import bindings inside `define(name, deps, fn)` callback (issue #17063)", function () {
	var result = cbBoth(undefined);
	expect(result[0]).toBe(42);
	expect(result[1]).toBe("named-value");
});
