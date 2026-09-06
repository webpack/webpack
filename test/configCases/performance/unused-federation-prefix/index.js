it("should count a prefix used through anything under it", () =>
	import("./use").then(({ default: a }) => {
		expect(a).toBe("prefix/a");
	}));
