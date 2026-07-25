it("should lazily compile a dynamically imported JSON module", (done) => {
	let resolved;
	const promise = import("./data.json").then((r) => (resolved = r));
	let generation = 0;
	import.meta.webpackHot.accept("./data.json", () => {
		generation++;
	});
	expect(resolved).toBe(undefined);
	expect(generation).toBe(0);
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then((result) => {
				expect(result).toHaveProperty("value", 42);
				expect(generation).toBe(0);
				NEXT(
					require("../../update")(done, true, () => {
						import("./data.json").then((result) => {
							expect(result).toHaveProperty("value", 43);
							expect(generation).toBe(1);
							done();
						}, done);
					})
				);
			}, done);
		})
	);
});
