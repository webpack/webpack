it("should stay quiet when every shared key is imported", () =>
	import("./use").then(({ default: used }) => {
		expect(used).toBe("used-lib");
	}));
