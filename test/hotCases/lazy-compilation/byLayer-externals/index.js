it("lazy activation with `byLayer` externals must not throw and must not reserve 'byLayer' as a request", (done) => {
	let resolved;
	const promise = import("./module").then((r) => (resolved = r));
	expect(resolved).toBe(undefined);
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then((result) => {
				expect(result).toHaveProperty("isFile");
				expect(typeof result.isFile).toBe("function");
				done();
			}, done);
		})
	);
});
