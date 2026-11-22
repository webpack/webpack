it("should resolve a lazy import() to the latest evaluation of a self-accepting module", (done) => {
	const promise = import("./module");
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then((first) => {
				expect(first.value).toBe("v1");
				NEXT(
					require("../../update")(done, true, () => {
						import("./module").then((second) => {
							expect(second.value).toBe("v2");
							setTimeout(() => {
								done();
							}, 100);
						}, done);
					})
				);
			}, done);
		})
	);
});
