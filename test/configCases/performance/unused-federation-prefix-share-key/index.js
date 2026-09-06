it("should count a prefix whose share key is spelled differently", () =>
	import("./use").then(({ default: value }) => {
		expect(value).toBe("pkg/subpath");
	}));
