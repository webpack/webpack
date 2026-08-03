import { esmValue } from "./esm-dep.js";

const withVar = require("./shadows-with-var.js");
const withFunction = require("./shadows-with-function.js");

it("should not let a wrapped body's var shadow the accessor it calls", () => {
	expect(esmValue).toBe("esm-dep");
	expect(withVar.value).toBe("dep");
	expect(withVar.local).toBe("local var");
});

it("should not let a wrapped body's function declaration shadow the accessor", () => {
	expect(withFunction.value).toBe("dep");
	expect(withFunction.local).toBe("local function");
});

it("should concatenate every module", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./dep.js",
		"./esm-dep.js",
		"./index.js",
		"./shadows-with-function.js",
		"./shadows-with-var.js"
	]);
});
