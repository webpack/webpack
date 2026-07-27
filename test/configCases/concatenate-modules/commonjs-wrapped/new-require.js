"use strict";

// `new require()` invokes the require function as a constructor, so it follows
// the `new` return-value rule exactly as Node.js does: an object or function
// export passes through unchanged, while a primitive export is discarded in
// favor of the freshly constructed instance.
const objectExport = new require("./reassign");
const fnExport = new require("./reassign-fn");
const primitiveExport = new require("./primitive-string");

exports.objectExport = objectExport;
exports.fnExportIsFn = typeof fnExport === "function";
exports.fnExportTag = fnExport.tag;
exports.fnExportCall = fnExport(21);
exports.primitiveIsNotTheString = primitiveExport !== "hello";
exports.primitiveIsObject =
	typeof primitiveExport === "object" && primitiveExport !== null;
exports.primitiveIsRequireInstance =
	primitiveExport instanceof __webpack_require__;

// `new require()()` calls the exported function, `new (require())()` constructs it
exports.newRequireCall = new require("./reassign-fn")(21);
exports.newRequireArrowCall = new require("./arrow")(1);

const counter = new (require("./class-export"))();
exports.constructedIsCounter = counter instanceof require("./class-export");
exports.constructedInc = counter.inc();

// `double` returns a primitive, so `new` yields the fresh instance
const doubleInstance = new (require("./reassign-fn"))();
exports.constructedFnIsInstance =
	doubleInstance instanceof require("./reassign-fn");
exports.constructedFnKeys = Object.keys(doubleInstance).length;

// the instance built from a primitive export is not callable, so `new require()()`
// throws a TypeError just as it does in Node.js
let callPrimitiveError = null;
try {
	new require("./primitive-string")();
} catch (err) {
	callPrimitiveError = err;
}
exports.callPrimitiveThrowsTypeError = callPrimitiveError instanceof TypeError;

// a primitive export is a fresh empty instance, not the module's exports value
exports.primitiveIsNotStringExport =
	primitiveExport !== require("./primitive-string");
exports.primitiveKeys = Object.keys(primitiveExport).length;
