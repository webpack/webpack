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
		"module-exports-property",
		"this-property",
		"chained",
		"two-target",
		"nested",
		"owned-then-write",
		"alias-no-write",
		"getter-no-read",
		"local-function",
		"global-as-value",
		"self-alias-value",
		"left-resolved-first",
		"var-chain",
		"babel-default"
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
		// a call today; recognizing the descriptor is a follow-up
		"define-property",
		"var-chain-impure",
		"var-pattern",
		"harmony"
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
