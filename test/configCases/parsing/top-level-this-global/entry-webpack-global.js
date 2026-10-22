require("./common");

const realGlobal = require("./real-global");

// built rather than written out, so the needle is not in the bundle it reads
const globalThisAccess = ["globalThis", "fromEntry"].join(".");
const runtimeGlobalAccess = ["__webpack_require__", "g", "fromEntry"].join(".");
const runtimeGlobalDefinition = ["__webpack_require__", "g = "].join(".");

it("should spell the global object as __webpack_require__.g", () => {
	const source = require("fs").readFileSync(__filename, "utf8");

	expect(source).toContain(runtimeGlobalAccess);
	expect(source).not.toContain(globalThisAccess);
	// and a target without the binding carries the polyfill
	expect(source).toContain(runtimeGlobalDefinition);
});

this.fromEntry = "entry";

it("should read the global object at the top level of the entry", () => {
	expect(realGlobal.fromEntry).toBe("entry");
});
