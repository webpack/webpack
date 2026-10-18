it("should keep a binding live in each runtime and each library of one runtime", async () => {
	for (const name of ["a", "b", "c", "d"]) {
		const library = await import(/* webpackIgnore: true */ `./${name}.mjs`);
		const before = library.count;
		library.bump();
		expect(library.count).toBe(before + 1);
	}
	const a = await import(/* webpackIgnore: true */ "./a.mjs");
	expect(a.read.early).toBe("ReferenceError");
});
