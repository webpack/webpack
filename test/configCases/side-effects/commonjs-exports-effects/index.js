import "./setup";
import "./define-setter-write";
import "./define-setter-chained-write";
import "./define-setter-declaration-write";
import "./define-setter-conditional-write";
import "./write-then-define-setter-loop";
import "./define-computed-setter-key";
import "./define-string-setter-key";
import "./define-setter-method";
import "./define-setter-shorthand";
import "./define-descriptor-prototype";
import "./define-descriptor-string-prototype";
import "./define-descriptor-value-getter";
import "./define-getter-then-read";
import "./define-shadowed-object";
import "./proto-write";
import "./proto-escaped-identifier";
import "./proto-escaped-string";
import "./proto-template-key";
import "./proto-in-chain";
import "./proto-through-alias";
import "./set-prototype-of";
import "./module-exports-getter-read";
import "./module-exports-property-setter";
import "./value-getter-read";
import "./value-binary-coercion";
import "./value-unary-coercion";
import "./value-in-proxy";
import "./value-instanceof";
import "./value-tagged-template";
import "./value-new";
import "./value-call";
import "./value-class-computed-key";
import "./value-class-extends-call";
import "./value-spread";
import "./destructuring-assignment-target";
import "./block-shadowed-exports";
import "./iife-write";
import "./statement-after-writes";
import "./replaced-module-exports-define";
import "./pure-exports-literal";
import "./pure-exports-function";
import "./pure-exports-chained";
import "./pure-module-exports-object";
import "./pure-module-exports-class";
import "./pure-define-value";
import "./pure-define-getter";
import "./pure-define-module-exports";
import "./pure-babel";
import "./pure-typescript";
import "./pure-conditional";
import "./pure-nested-blocks";
import "./pure-write-then-define-value";
import "./pure-module-exports-then-exports";
import "./pure-escaped-key";
import "./pure-annotated-call";

const bundled = (name) => `./${name}.js` in __webpack_modules__;

it("should evaluate every module whose export writes may run user code", () => {
	const expected = [
		"define-setter-write",
		"define-setter-chained-write",
		"define-setter-declaration-write",
		"define-setter-conditional-write",
		"write-then-define-setter-loop",
		"define-computed-setter-key",
		"define-string-setter-key",
		"define-setter-method",
		"define-setter-shorthand",
		"define-descriptor-prototype",
		"define-descriptor-string-prototype",
		"define-descriptor-value-getter",
		"define-getter-then-read",
		"define-shadowed-object",
		"set-prototype-of",
		"module-exports-getter-read",
		"module-exports-property-setter",
		"value-getter-read",
		"value-binary-coercion",
		"value-unary-coercion",
		"value-in-proxy",
		"value-instanceof",
		"value-tagged-template",
		"value-new",
		"value-call",
		"value-class-computed-key",
		"value-class-extends-call",
		"value-spread",
		"destructuring-assignment-target",
		"block-shadowed-exports",
		"iife-write",
		"statement-after-writes"
	];
	const missing = expected.filter((name) => !global.cjsEffects.includes(name));
	expect(missing).toEqual([]);
	expect(expected.filter((name) => !bundled(name))).toEqual([]);
});

it("should evaluate a definition on a replaced module.exports", () => {
	expect(global.cjsReplacedMarker).toBe(true);
	expect(bundled("replaced-module-exports-define")).toBe(true);
});

it("should drop a module whose export writes run no user code", () => {
	const dropped = [
		"pure-exports-literal",
		"pure-exports-function",
		"pure-exports-chained",
		"pure-module-exports-object",
		"pure-module-exports-class",
		"pure-define-value",
		"pure-define-getter",
		"pure-define-module-exports",
		"pure-babel",
		"pure-typescript",
		"pure-conditional",
		"pure-nested-blocks",
		"pure-write-then-define-value",
		"pure-module-exports-then-exports",
		"pure-escaped-key",
		"pure-annotated-call"
	];
	expect(dropped.filter(bundled)).toEqual([]);
});

it("should retain modules whose prototype writes may run user code", () => {
	const expected = [
		"proto-write",
		"proto-escaped-identifier",
		"proto-escaped-string",
		"proto-template-key",
		"proto-in-chain",
		"proto-through-alias"
	];
	expect(expected.filter((name) => !bundled(name))).toEqual([]);
	// Deno disables Object.prototype.__proto__ by default.
	if (!process.versions.deno) {
		const missing = expected.filter((name) => !global.cjsEffects.includes(name));
		expect(missing).toEqual([]);
	}
	delete global.cjsEffects;
	delete global.cjsReplacedMarker;
});
