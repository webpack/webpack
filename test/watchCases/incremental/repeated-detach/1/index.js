it("should remove the detached subtree", () => {
	for (const stats of STATS_JSON.children) {
		expect(stats.modules.map((module) => module.name)).toEqual(["./index.js"]);
	}
});
