it("should bind a source phase import named like a keyword of the clause", async () => {
	const bindings = await import("./bindings.js");

	for (const name of ["from", "source", "of"]) {
		expect(bindings[name] instanceof WebAssembly.Module).toBe(true);
	}
});
