it("should stay silent when no module is emitted twice", () => {
	// Each async chunk reaches its own module, so nothing is duplicated.
	return Promise.all([import("./only"), import("./other")]).then(() => {
		expect(__STATS__.hints).toHaveLength(0);
	});
});
