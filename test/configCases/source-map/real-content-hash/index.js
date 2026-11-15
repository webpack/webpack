it("should load an async chunk", () =>
	import("./async").then((m) => {
		expect(m.default).toBe("async");
	}));
