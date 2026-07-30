it("should dispose a top-level `using` resource in a generator-lowered module", () =>
	import("./importer.js").then(({ results }) => {
		expect(results.value).toBe(42);
		expect(results.disposed).toBe(true);
	}));
