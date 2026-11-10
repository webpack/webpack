import wrapped from "./wrapped";
import * as hoisted from "./hoisted";
import data from "./data.json";

it("should keep marker-like text in a JSON module as data", () => {
	expect(data).toEqual({
		namespace: "__WEBPACK_MODULE_REFERENCE__0_ns__._",
		exportPath: "__WEBPACK_MODULE_REFERENCE__1_5b2276616c7565225d__._",
		inName: "x__WEBPACK_MODULE_REFERENCE__2_ns__"
	});
	expect(wrapped.data).toEqual(data);
});

it("should keep marker-like text in an asset/source module as data", () => {
	expect(wrapped.text).toBe("text __WEBPACK_MODULE_REFERENCE__0_ns__._ stays\n");
});

it("should keep marker-like text in strings, templates, regexps and comments of a wrapped module", () => {
	expect(wrapped.string).toBe("__WEBPACK_MODULE_REFERENCE__0_ns__._");
	expect(wrapped.template).toBe("__WEBPACK_MODULE_REFERENCE__1_ns__._");
	expect(wrapped.regexp).toBe("__WEBPACK_MODULE_REFERENCE__2_ns__");
	expect(wrapped.comment).toBe(true);
	expect(hoisted.string).toBe("__WEBPACK_MODULE_REFERENCE__0_ns__._");
});

it("should resolve a module reference a plugin writes into a wrapped or hoisted module", () => {
	expect(wrapped.target).toBe("target value");
	expect(wrapped.plugin).toBe("target value");
	expect(hoisted.plugin).toBe("target value");
});

it("should concatenate the modules", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./data.json",
		"./hoisted.js",
		"./index.js",
		"./target.js",
		"./text.txt",
		"./wrapped.js"
	]);
});
