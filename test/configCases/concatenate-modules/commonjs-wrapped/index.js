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
import * as newRequire from "./new-require";
import nullExport from "./primitive-null";
import numberExport from "./primitive-number";
import stringExport from "./primitive-string";
import double from "./reassign-fn";
import reassign from "./reassign";
import * as thisExports from "./this-exports";
import * as thisRead from "./this-read";

it("should support module.exports reassigned to an object", () => {
	expect(reassign.r).toBe("reassigned");
	expect(reassign.n).toBe(1);
});

it("should support module.exports reassigned to a function with statics", () => {
	expect(double(21)).toBe(42);
	expect(double.tag).toBe("fn");
});

it("should support module.exports reassigned to an arrow function", () => {
	expect(arrow(1)).toBe(2);
});

it("should support module.exports reassigned to a class", () => {
	const c = new Counter();
	expect(c.inc()).toBe(1);
	expect(c.inc()).toBe(2);
});

it("should support module.exports reassigned to a primitive", () => {
	expect(numberExport).toBe(42);
	expect(stringExport).toBe("hello");
	expect(nullExport).toBe(null);
});

it("should support module.exports reassigned to an array", () => {
	expect(array).toEqual([1, 2, 3]);
});

it("should preserve `this` as the exports object", () => {
	expect(thisExports.t).toBe("this-export");
	expect(thisRead.viaThis).toBe("v");
	// exports.helper() is called with the exports object as `this`
	expect(callContext.run()).toBe("ctx-ok");
});

it("should support exports defined via Object.defineProperty/defineProperties", () => {
	expect(defineProperty.d).toBe("defined");
	expect(defineProperties.a).toBe(1);
	expect(defineProperties.b).toBe(2);
});

it("should support an exports object literal with getters", () => {
	expect(getterObject.x).toBe(5);
	expect(getterObject.y).toBe(6);
});

it("should support an exports object that escapes the module", () => {
	expect(escaped.e).toBe("escaped");
	expect(escaped.mutated).toBe(true);
});

it("should honor the __esModule interop flag", () => {
	expect(esmoduleDefault).toBe("the-default");
	expect(esmoduleNamed).toBe("n");
});

it("should support the `module.exports = exports = {}` alias form", () => {
	expect(moduleExportsExports.z).toBe(9);
	expect(moduleExportsExports.y).toBe(10);
});

it("should support parenthesized `(module.exports = {}).x =`", () => {
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

it("should support exports built in a conditional branch", () => {
	expect(conditional.branch).toBe("b");
});

it("should support a frozen exports object", () => {
	expect(frozen.f).toBe(1);
});

it("should support an exports method that reads `this`", () => {
	expect(methodThis.getValue()).toBe(10);
});

it("should keep live bindings through a getter", () => {
	expect(liveBinding.v).toBe(0);
	liveBinding.set(7);
	expect(liveBinding.v).toBe(7);
});

it("should follow Node's `new require()` semantics when concatenated", () => {
	// object and function exports pass through the `new` unchanged
	expect(newRequire.objectExport).toBe(reassign);
	expect(newRequire.fnExportIsFn).toBe(true);
	expect(newRequire.fnExportTag).toBe("fn");
	expect(newRequire.fnExportCall).toBe(42);
	// a primitive export is discarded in favor of the constructed instance
	expect(newRequire.primitiveIsNotTheString).toBe(true);
	expect(newRequire.primitiveIsObject).toBe(true);
	expect(newRequire.primitiveIsRequireInstance).toBe(true);
	expect(newRequire.primitiveIsNotStringExport).toBe(true);
	expect(newRequire.primitiveKeys).toBe(0);
});

it("should follow Node's semantics for called and constructed `new require()`", () => {
	// `new require()()` calls the exported function
	expect(newRequire.newRequireCall).toBe(42);
	expect(newRequire.newRequireArrowCall).toBe(2);
	// `new (require())()` constructs the exported class/function
	expect(newRequire.constructedIsCounter).toBe(true);
	expect(newRequire.constructedInc).toBe(1);
	expect(newRequire.constructedFnIsInstance).toBe(true);
	expect(newRequire.constructedFnKeys).toBe(0);
	// calling the instance built from a primitive export throws, as in Node.js
	expect(newRequire.callPrimitiveThrowsTypeError).toBe(true);
});

it("should concatenate every wrapped CommonJS module into the entry", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// named rather than counted, so a mismatch says which module dropped out
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./array-export.js",
		"./arrow.js",
		"./call-context.js",
		"./class-export.js",
		"./conditional.js",
		"./define-properties.js",
		"./define-property.js",
		"./escaped.js",
		"./esmodule-flag.js",
		"./exports-local-reassign.js",
		"./frozen.js",
		"./getter-object.js",
		"./iife-assign.js",
		"./index.js",
		"./live-binding.js",
		"./method-this.js",
		"./mixed-then-reassign.js",
		"./module-exports-exports.js",
		"./multi-reassign.js",
		"./new-require.js",
		"./primitive-null.js",
		"./primitive-number.js",
		"./primitive-string.js",
		"./reassign-fn.js",
		"./reassign.js",
		"./this-exports.js",
		"./this-read.js"
	]);
});
