import { takeEffects } from "./effects.js";

it("should not run a side effect that only a deferred import reaches", async () => {
	const page = await import(/* webpackChunkName: "defer-page-1" */ "./defer-page-1.js");
	await import(/* webpackChunkName: "defer-page-2" */ "./defer-page-2.js");
	expect(takeEffects()).toEqual([]);
	expect(page.run()).toEqual(["b", "a", "string"]);
	expect(takeEffects()).toEqual(["a"]);
});

/**
 * Returns the cross-chunk imports bailouts stats report for a module.
 * @param {string} name the module name
 * @returns {string[]} the bailouts
 */
const getBailouts = (name) =>
	__STATS__.children[__STATS_I__].modules
		.find((module) => module.name === name)
		.optimizationBailout.filter((reason) =>
			reason.startsWith("Cross-chunk imports bailout: ")
		);

it("should report each bailout once after an additional seal", () => {
	expect(getBailouts("./shared/runtime.js")).toEqual([
		"Cross-chunk imports bailout: module uses the webpack runtime"
	]);
	// the deferred import calls its init function on first access
	expect(getBailouts("./shared/a.js")).toEqual([]);
});
