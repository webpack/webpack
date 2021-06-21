it("should not emit files", () => {
	expect(STATS_JSON.assets.map(a => a.name)).not.toContainEqual(
		expect.stringMatching(/\.txt$/)
	);
});
