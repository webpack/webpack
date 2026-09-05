it("should report the config key, not the share key", () =>
	import("./use").then(({ default: used }) => {
		expect(used).toBe("used-lib");
	}));
