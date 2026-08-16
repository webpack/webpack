it("should warn about a module emitted into several chunks", () =>
	Promise.all([import("./a"), import("./b")]));
