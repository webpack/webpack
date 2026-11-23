import "./effects.js";

it("should keep a module in the registry when linking it would grow the output", async () => {
	const page = await import(/* webpackChunkName: "page-1" */ "./page-1.js");
	await import(/* webpackChunkName: "page-2" */ "./page-2.js");
	expect(page.run()).toEqual(["a", ["x", "y"]]);
	const module = __STATS__.children[__STATS_I__].modules.find(
		(module) => module.name === "./shared/ns.js"
	);
	expect(module.optimizationBailout).toContain(
		"Cross-chunk imports bailout: linking it would grow the output"
	);
});
