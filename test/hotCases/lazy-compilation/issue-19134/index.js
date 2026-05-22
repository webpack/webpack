it("first activation of a lazy 'page' must not throw under UMD + closure externals (issue #19134)", (done) => {
	let resolved;
	const promise = import("./page").then((r) => (resolved = r));
	expect(resolved).toBe(undefined);
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then((result) => {
				expect(result).toHaveProperty("isFile");
				expect(result).toHaveProperty("joinedPath");
				expect(typeof result.isFile).toBe("function");
				expect(result.joinedPath).toBe(require("path").join("a", "b"));
				done();
			}, done);
		})
	);
});
