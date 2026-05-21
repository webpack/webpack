it("first activation of a lazy import with a UMD external must not throw", (done) => {
	let resolved;
	const promise = import("./module").then((r) => (resolved = r));
	expect(resolved).toBe(undefined);
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then((result) => {
				expect(result).toHaveProperty("default", "answer=42");
				done();
			}, done);
		})
	);
});
