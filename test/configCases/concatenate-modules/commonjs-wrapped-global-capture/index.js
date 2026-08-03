import { esmValue } from "./esm-local.js";

global.sharedNameOfConcatenation = "real global";

const readsGlobal = require("./reads-global.js");

it("should not capture a wrapped body's free global with a top-level binding", () => {
	expect(esmValue).toBe("esm local");
	expect(readsGlobal.seen).toBe("real global");
	delete global.sharedNameOfConcatenation;
});

it("should concatenate every module", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./esm-local.js",
		"./index.js",
		"./reads-global.js"
	]);
});
