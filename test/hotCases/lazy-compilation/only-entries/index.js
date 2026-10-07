it("should not lazily compile to import() when not configured", (done) => {
	let resolved;
	const promise = import("./module").then((r) => (resolved = r));
	expect(resolved).toBe(undefined);
	// a lazily compiled import would wait for a re-compile that never comes
	promise.then(() => {
		expect(resolved).toHaveProperty("default", 42);
		done();
	}, done).catch(done);
});
