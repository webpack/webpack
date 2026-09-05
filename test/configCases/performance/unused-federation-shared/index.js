it("should report a shared key nothing imports", () =>
	import("./use").then(({ default: used }) => {
		expect(used).toBe("used-lib");
	}));
