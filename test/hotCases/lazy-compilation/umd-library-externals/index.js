it("lazy-compiled imports should set wasInactive flag on dispose with closure-variable library types", (done) => {
	let resolved;
	const promise = import("./module").then((r) => (resolved = r));
	expect(resolved).toBe(undefined);
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then((result) => {
				expect(result).toHaveProperty("default", 42);
				done();
			}, done);
		})
	);
});
