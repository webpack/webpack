it("should await provided dependencies without arrow functions", () =>
	import("./consumer.js").then(({ result }) => {
		expect(result).toEqual([true, 42, 42, 42, 42, 42]);
	}));
