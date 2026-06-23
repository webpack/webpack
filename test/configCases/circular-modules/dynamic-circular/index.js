it("should skip the async import() edge and mark only the sync cycle as circular", () =>
	import("./a").then((m) => {
		expect(typeof m.a).toBe("function");
	}));
