import { esmValue } from "./esm-dep.js";

// evaluation-only: it must not mark alias.js's exports used
require("./alias.js");

it("should still evaluate a require() whose export alias is unused", () => {
	expect(esmValue).toBe("esm-dep");
	expect(require("./alias.js").used).toBe("used");
	expect(global.__sideEffectOrder).toEqual(["side", "whole"]);
});

it("should evaluate such a module exactly once", () => {
	expect(require("./alias.js").used).toBe("used");
	expect(global.__sideEffectOrder).toEqual(["side", "whole"]);
});

it("should concatenate every module", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./alias.js",
		"./esm-dep.js",
		"./index.js",
		"./side.js",
		"./whole.js"
	]);
	delete global.__sideEffectOrder;
});
