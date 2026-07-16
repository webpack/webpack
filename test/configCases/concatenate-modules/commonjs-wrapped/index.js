import callContext from "./call-context";
import * as defineProperty from "./define-property";
import * as escaped from "./escaped";
import double from "./reassign-fn";
import reassign from "./reassign";
import * as thisExports from "./this-exports";
import * as thisRead from "./this-read";

it("should wrap a module that reassigns module.exports", () => {
	expect(reassign.r).toBe("reassigned");
	expect(reassign.n).toBe(1);
});

it("should wrap a module whose default export is a function", () => {
	expect(double(21)).toBe(42);
	expect(double.tag).toBe("fn");
});

it("should preserve `this` as the exports object", () => {
	expect(thisExports.t).toBe("this-export");
	expect(thisRead.viaThis).toBe("v");
	// exports.helper() is called with the exports object as `this`
	expect(callContext.run()).toBe("ctx-ok");
});

it("should wrap Object.defineProperty(exports) getters", () => {
	expect(defineProperty.d).toBe("defined");
});

it("should wrap a module whose exports object escapes", () => {
	expect(escaped.e).toBe("escaped");
	expect(escaped.mutated).toBe(true);
});

it("should concatenate every wrapped CommonJS module into the entry", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index.js + the seven wrapped modules
	expect(concatModules[0].modules.length).toBe(8);
});
