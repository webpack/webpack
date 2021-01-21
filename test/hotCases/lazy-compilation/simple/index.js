it("should compile to lazy imported module", done => {
	let resolved;
	const promise = import("./module").then(r => (resolved = r));
	expect(resolved).toBe(undefined);
	setTimeout(() => {
		expect(resolved).toBe(undefined);
		NEXT(
			require("../../update")(done, true, () => {
				promise.then(result => {
					expect(result).toHaveProperty("default", 42);
					setTimeout(() => {
						done();
					}, 1000);
				}, done);
			})
		);
	}, 1000);
});
