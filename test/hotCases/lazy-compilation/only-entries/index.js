it("should not lazily compile to import() when not configured", done => {
	let resolved;
	const promise = import("./module").then(r => (resolved = r));
	expect(resolved).toBe(undefined);
	setTimeout(() => {
		expect(resolved).toHaveProperty("default", 42);
		done();
	}, 1000);
});
