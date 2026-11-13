it("should preserve replaced Object enumeration methods", () => {
	const keys = Object.keys;
	const values = Object.values;
	const entries = Object.entries;
	try {
		Object.keys = () => ["keys"];
		Object.values = () => ["values"];
		Object.entries = () => ["entries"];
		const result = [
			Object.keys([1]), Object.keys("a"),
			Object.values([1]), Object.values("a"),
			Object.entries([1]), Object.entries("a")
		];
		Object.keys = keys;
		Object.values = values;
		Object.entries = entries;
		expect(result).toEqual([
			["keys"], ["keys"], ["values"], ["values"], ["entries"], ["entries"]
		]);
	} finally {
		Object.keys = keys;
		Object.values = values;
		Object.entries = entries;
	}
});
