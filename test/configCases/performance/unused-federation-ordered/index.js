it("should list remotes before shared keys, each by name", () =>
	import("./use").then(({ default: used }) => {
		expect(used).toBe("used-lib");
	}));
