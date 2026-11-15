it("should await provided dependencies before deferred evaluation", () =>
	import.defer("./consumer.js").then(({ result }) => {
		expect(result).toEqual([true, 42, 42, 42, 42, 42]);
	}));
