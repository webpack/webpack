it("should report a module emitted into several chunks as an error", () =>
	Promise.all([import("./a"), import("./b")]));
