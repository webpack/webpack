it("should work", () => {
	const stats = __STATS__.children[__STATS_I__];

	expect(stats.assets.findIndex(a => a.name === "test.js") > -1).toBe(true);

	expect(
		stats.assets.findIndex(a => a.name === `${__STATS_I__}/main.css`) > -1
	).toBe(true);

	if (__STATS_I__ === 0) {
		// ./main.css
		// ./a.css
		// and it still output two runtime module:
		// 	 'webpack/runtime/make namespace object'
		// 	 'webpack/runtime/css loading'
		expect(stats.modules.length).toBe(4);
	} else if (__STATS_I__ === 1) {
		stats.modules
			.filter(module => module.moduleType === "css/auto")
			.forEach(module => {
				expect(module.sizes["javascript"] === 1).toBe(true);
			});
	} else if (__STATS_I__ === 2) {
		stats.modules
			.filter(module => module.moduleType === "css/auto")
			.forEach(module => {
				expect(module.sizes["javascript"] === 1).toBe(false);
			});
	}
});
