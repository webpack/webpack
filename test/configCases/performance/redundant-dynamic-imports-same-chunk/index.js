it("should warn when the target shares the importer's own chunk", () =>
	import("./lazy").then((module) => module.lazy()).then((value) => {
		expect(value).toBe(14);
	}));
