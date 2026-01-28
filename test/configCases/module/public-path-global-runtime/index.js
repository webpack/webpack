it("should use/not use globalThis",  () => {
	expect(new URL("./file.text", import.meta.url)).toBeDefined();

	const stats = __STATS__.children[__STATS_I__];

	expect(stats.modules.length).toBe(__STATS_I__ === 0 ? 6 : 5);
});
