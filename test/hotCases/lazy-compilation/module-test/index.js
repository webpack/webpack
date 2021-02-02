it("should not lazily compile configured imports", done => {
	let resolvedA;
	let resolvedB;
	const promiseA = import("./moduleA").then(r => (resolvedA = r));
	const promiseB = import("./moduleB").then(r => (resolvedB = r));
	expect(resolvedA).toBe(undefined);
	expect(resolvedB).toBe(undefined);
	setTimeout(() => {
		expect(resolvedA).toBe(undefined);
		expect(resolvedB).toHaveProperty("default", "B");
		NEXT(
			require("../../update")(done, true, () => {
				promiseA.then(result => {
					expect(result).toHaveProperty("default", "A");
					setTimeout(() => {
						done();
					}, 1000);
				}, done);
			})
		);
	}, 1000);
});
