const REASON =
	'Analyzable ESM bailout: devtool "eval" wraps the module in eval(), where import.meta does not parse';

it("should still report it when the result is restored from the cache", () => {
	const shared = STATS_JSON.modules.find(
		(module) => module.name === "./shared.js"
	);
	// restored rather than generated, so only the stored reasons can report it
	expect(shared.codeGenerated).toBe(false);
	expect(shared.optimizationBailout).toContain(REASON);
});
