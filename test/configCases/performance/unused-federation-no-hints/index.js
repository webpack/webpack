it("should report even though hints are off", () =>
	import("./use").then(({ default: used }) => {
		expect(used).toBe("used-lib");
	}));
