it("should use/not use globalThis",  () => {
	expect(global).toBeDefined();

	const stats = __STATS__.children[__STATS_I__];

	expect(stats.modules.length).toBe(__STATS_I__ === 0 ? 2 : 1);
});
