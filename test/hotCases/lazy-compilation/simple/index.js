it("should compile to lazy imported module", done => {
	let resolved;
	const promise = import("./module").then(r => (resolved = r));
	let generation = 0;
	import.meta.webpackHot.accept("./module", () => {
		generation++;
	});
	expect(resolved).toBe(undefined);
	setTimeout(() => {
		expect(resolved).toBe(undefined);
		expect(generation).toBe(0);
		NEXT(
			require("../../update")(done, true, () => {
				promise.then(result => {
					expect(result).toHaveProperty("default", 42);
					expect(generation).toBe(0);
					NEXT(
						require("../../update")(done, true, () => {
							expect(result).toHaveProperty("default", 42);
							expect(generation).toBe(1);
							import("./module").then(result => {
								expect(result).toHaveProperty("default", 43);
								setTimeout(() => {
									done();
								}, 1000);
							}, done);
						})
					);
				}, done);
			})
		);
	}, 1000);
});
