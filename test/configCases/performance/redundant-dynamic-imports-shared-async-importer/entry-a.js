it("should still defer the target in the entry that lacks it", () => {
	expect(__STATS__.hints).toHaveLength(0);
	return import("./mid").then((module) =>
		module.load().then((loaded) => {
			expect(loaded.target).toBe(1);
		})
	);
});
