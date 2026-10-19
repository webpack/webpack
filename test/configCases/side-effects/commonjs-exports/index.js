import { a as exportsProperty } from "./exports-property";
import { value } from "./used";
import "./module-exports-object";
import "./module-exports-function";
import "./module-exports-property";
import "./this-property";
import "./chained";
import "./two-target";
import "./nested";
import "./owned-then-write";
import "./alias-no-write";
import "./getter-no-read";
import "./local-function";
import "./global-as-value";
import "./self-alias-value";
import "./left-resolved-first";
import "./deep";
import "./call";
import "./computed-key";
import "./identifier-key";
import "./compound";
import "./update";
import "./delete";
import "./reexport";
import "./shadowed";
import "./foreign";
import "./exports-rebound";
import "./setter";
import "./proto-then-write";
import "./class-then-write";
import "./pure-call-then-write";
import "./getter-then-read";
import "./module-other-property";
import "./define-property";
import "./define-property-module-exports";
import "./define-property-getter";
import "./define-property-fresh-object";
import "./define-property-babel";
import "./define-property-setter-then-write";
import "./define-property-computed-descriptor-key";
import "./define-property-replaced";
import "./define-property-value-getter";
import "./define-property-computed-key";
import "./define-property-foreign";
import "./define-property-impure-value";
import "./var-chain";
import "./var-chain-impure";
import "./var-pattern";
import "./babel-default";
import "./harmony";

const bundled = (name) => `./${name}.js` in __webpack_modules__;

it("should drop a CommonJS module that only assigns pure values to its exports", () => {
	const dropped = [
		"exports-property",
		"module-exports-object",
		"module-exports-function",
		"chained",
		"nested",
		"getter-no-read",
		"local-function",
		"global-as-value",
		"self-alias-value",
		"var-chain",
		"babel-default",
		"define-property",
		"define-property-module-exports",
		"define-property-getter",
		"define-property-fresh-object",
		"define-property-babel"
	];
	expect(dropped.filter(bundled)).toEqual([]);
});

it("should keep a CommonJS module whose export assignment has other effects", () => {
	const kept = [
		"deep",
		"call",
		"computed-key",
		"identifier-key",
		"compound",
		"update",
		"delete",
		"reexport",
		"shadowed",
		"foreign",
		"exports-rebound",
		"setter",
		"proto-then-write",
		"class-then-write",
		"pure-call-then-write",
		"getter-then-read",
		"module-other-property",
		"module-exports-property",
		"this-property",
		"two-target",
		"owned-then-write",
		"alias-no-write",
		"left-resolved-first",
		"var-chain-impure",
		"var-pattern",
		"harmony",
		"define-property-setter-then-write",
		"define-property-computed-descriptor-key",
		"define-property-replaced",
		"define-property-value-getter",
		"define-property-computed-key",
		"define-property-foreign",
		"define-property-impure-value"
	];
	expect(kept.filter((name) => !bundled(name))).toEqual([]);
	expect(global.cjsForeignMarker).toBe(1);
});

it("should keep a side-effect-free CommonJS module whose export is used", () => {
	expect(value).toBe(42);
	expect(bundled("used")).toBe(true);
	delete global.cjsForeignMarker;
	delete global.cjsReboundMarker;
});
