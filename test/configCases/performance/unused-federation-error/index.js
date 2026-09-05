it("should raise an error when hints are errors", () =>
	import("./use").then(({ default: used }) => {
		expect(used).toBe("used-lib");
	}));
