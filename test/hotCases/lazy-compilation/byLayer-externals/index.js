it("lazy activation reserves both base and layer-scoped byLayer externals", (done) => {
	let resolved;
	const promise = import("./module").then((r) => (resolved = r));
	expect(resolved).toBe(undefined);
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then((result) => {
				expect(typeof result.isFile).toBe("function");
				expect(result.joinedPath).toBe(require("path").join("a", "b"));
				done();
			}, done);
		})
	);
});
