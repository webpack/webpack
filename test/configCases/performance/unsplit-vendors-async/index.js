it("should ignore an async chunk, which no returning visitor downloads twice", () =>
	import("./lazy").then(({ default: vendor }) => {
		expect(vendor).toBe("vendor");
	}));
