it("should compile and evaluate fine", () =>
	Promise.all([import("./a"), import("./b")]));
