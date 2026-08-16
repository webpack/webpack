it("should stay silent when performance hints are disabled", () =>
	Promise.all([import("./a"), import("./b")]).then(() => {
		expect(__STATS__.warnings).toHaveLength(0);
		expect(__STATS__.errors).toHaveLength(0);
		expect(__STATS__.hints).toHaveLength(0);
	}));
