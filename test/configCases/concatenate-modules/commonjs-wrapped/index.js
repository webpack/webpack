import array from "./array-export";
import arrow from "./arrow";
import callContext from "./call-context";
import Counter from "./class-export";
import * as conditional from "./conditional";
import * as defineProperties from "./define-properties";
import * as defineProperty from "./define-property";
import * as escaped from "./escaped";
import esmoduleDefault, { named as esmoduleNamed } from "./esmodule-flag";
import * as exportsLocalReassign from "./exports-local-reassign";
import * as frozen from "./frozen";
import * as getterObject from "./getter-object";
import * as iifeAssign from "./iife-assign";
import * as liveBinding from "./live-binding";
import * as methodThis from "./method-this";
import * as mixedThenReassign from "./mixed-then-reassign";
import * as moduleExportsExports from "./module-exports-exports";
import * as multiReassign from "./multi-reassign";
import nullExport from "./primitive-null";
import numberExport from "./primitive-number";
import stringExport from "./primitive-string";
import double from "./reassign-fn";
import reassign from "./reassign";
import * as thisExports from "./this-exports";
import * as thisRead from "./this-read";

it("should wrap module.exports reassigned to an object", () => {
	expect(reassign.r).toBe("reassigned");
	expect(reassign.n).toBe(1);
});

it("should wrap module.exports reassigned to a function with statics", () => {
	expect(double(21)).toBe(42);
	expect(double.tag).toBe("fn");
});

it("should wrap module.exports reassigned to an arrow function", () => {
	expect(arrow(1)).toBe(2);
});

it("should wrap module.exports reassigned to a class", () => {
	const c = new Counter();
	expect(c.inc()).toBe(1);
	expect(c.inc()).toBe(2);
});

it("should wrap module.exports reassigned to primitives", () => {
	expect(numberExport).toBe(42);
	expect(stringExport).toBe("hello");
	expect(nullExport).toBe(null);
});

it("should wrap module.exports reassigned to an array", () => {
	expect(array).toEqual([1, 2, 3]);
});

it("should preserve `this` as the exports object", () => {
	expect(thisExports.t).toBe("this-export");
	expect(thisRead.viaThis).toBe("v");
	// exports.helper() is called with the exports object as `this`
	expect(callContext.run()).toBe("ctx-ok");
});

it("should wrap Object.defineProperty / defineProperties getters", () => {
	expect(defineProperty.d).toBe("defined");
	expect(defineProperties.a).toBe(1);
	expect(defineProperties.b).toBe(2);
});

it("should wrap object literals with getters", () => {
	expect(getterObject.x).toBe(5);
	expect(getterObject.y).toBe(6);
});

it("should wrap a module whose exports object escapes", () => {
	expect(escaped.e).toBe("escaped");
	expect(escaped.mutated).toBe(true);
});

it("should honor the __esModule interop flag when wrapping", () => {
	expect(esmoduleDefault).toBe("the-default");
	expect(esmoduleNamed).toBe("n");
});

it("should wrap the `module.exports = exports = {}` alias form", () => {
	expect(moduleExportsExports.z).toBe(9);
});

it("should wrap parenthesized `(module.exports = {}).x =`", () => {
	expect(iifeAssign.x).toBe(3);
});

it("should not export a reassigned local `exports` binding", () => {
	// reassigning the local `exports` does not change module.exports
	expect(exportsLocalReassign.keep).toBe(1);
	expect(exportsLocalReassign.gone).toBe(undefined);
});

it("should take the last of multiple module.exports reassignments", () => {
	expect(multiReassign.c).toBe(3);
	expect(multiReassign.a).toBe(undefined);
	expect(mixedThenReassign.late).toBe(2);
	expect(mixedThenReassign.early).toBe(undefined);
});

it("should wrap conditional and frozen exports", () => {
	expect(conditional.branch).toBe("b");
	expect(frozen.f).toBe(1);
});

it("should wrap an object whose method uses `this`", () => {
	expect(methodThis.getValue()).toBe(10);
});

it("should keep live bindings through a getter", () => {
	expect(liveBinding.v).toBe(0);
	liveBinding.set(7);
	expect(liveBinding.v).toBe(7);
});

it("should concatenate every wrapped CommonJS module into the entry", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index.js + all 25 wrapped fixtures
	expect(concatModules[0].modules.length).toBe(26);
});
