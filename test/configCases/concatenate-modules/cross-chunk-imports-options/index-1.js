import { takeEffects } from "./effects.js";

it("should keep side effects in the registry where a failed module runs again", async () => {
	const page = await import(/* webpackChunkName: "page-1" */ "./page-1.js");
	await import(/* webpackChunkName: "page-2" */ "./page-2.js");
	expect(page.run()).toEqual(["a", ["x", "y"]]);
	expect(takeEffects()).toEqual(["a"]);
	const module = __STATS__.children[__STATS_I__].modules.find(
		(module) => module.name === "./shared/a.js"
	);
	expect(module.optimizationBailout).toContain(
		"Cross-chunk imports bailout: module has side effects and a failed module runs again on retry"
	);
});
