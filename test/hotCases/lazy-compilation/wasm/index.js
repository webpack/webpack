it("should lazily compile a dynamically imported async WebAssembly module", (done) => {
	let resolved;
	const promise = import("./wasm.wat").then((r) => (resolved = r));
	let generation = 0;
	import.meta.webpackHot.accept("./wasm.wat", () => {
		generation++;
	});
	expect(resolved).toBe(undefined);
	expect(generation).toBe(0);
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then((result) => {
				expect(result.getNumber()).toBe(40);
				expect(generation).toBe(0);
				NEXT(
					require("../../update")(done, true, () => {
						import("./wasm.wat").then((result) => {
							expect(result.getNumber()).toBe(42);
							expect(generation).toBe(1);
							done();
						}, done);
					})
				);
			}, done);
		})
	);
});
