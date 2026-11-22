import { takeEffects } from "./effects.js";

it("should not run a side effect that only a deferred import reaches", async () => {
	const page = await import(/* webpackChunkName: "defer-page-1" */ "./defer-page-1.js");
	await import(/* webpackChunkName: "defer-page-2" */ "./defer-page-2.js");
	expect(takeEffects()).toEqual([]);
	expect(page.run()).toEqual(["b", "a"]);
	expect(takeEffects()).toEqual(["a"]);
});

it("should report each bailout once after an additional seal", () => {
	const module = __STATS__.children[__STATS_I__].modules.find(
		(module) => module.name === "./shared/a.js"
	);
	expect(
		module.optimizationBailout.filter((reason) =>
			reason.startsWith("Cross-chunk imports bailout: ")
		)
	).toEqual([
		"Cross-chunk imports bailout: module has side effects that its chunk's loads don't all run first"
	]);
});
