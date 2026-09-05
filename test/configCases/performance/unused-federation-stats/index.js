it("should report through the stats channel", () =>
	import("./use").then(({ default: used }) => {
		expect(used).toBe("used-lib");
		expect(__STATS__.hints).toHaveLength(1);
		expect(__STATS__.hints[0].message).toMatch(
			/unused federation config: 1 entry was declared/
		);
		expect(__STATS__.warnings).toHaveLength(0);
		expect(__STATS__.errors).toHaveLength(0);
	}));
