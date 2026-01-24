it("should provide and consume the shared module correctly when output ESM library / 1", async () => {
	expect(await import("lib")).toEqual(
		expect.objectContaining({
			default: "foo~bar~index.js"
		})
	);

	expect(await import("lib/esm")).toEqual(
		expect.objectContaining({
			default: "foo~bar~index.esm.js"
		})
	);
});
