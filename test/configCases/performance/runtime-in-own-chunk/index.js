it("should load the async chunk", () =>
	import("./lazy").then((m) => {
		expect(m.default).toBe(42);
	}));
