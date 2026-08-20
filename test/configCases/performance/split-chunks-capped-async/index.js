it("should name an unnamed chunk by its id, and report the async cap", () =>
	Promise.all([import("./a"), import("./b")]).then(([a, b]) => {
		expect(a.default).toBe("lib-alib-b");
		expect(b.default).toBe("lib-alib-bb");
	}));
