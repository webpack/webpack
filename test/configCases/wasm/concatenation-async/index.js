it("should concatenate async wasm modules with their consumers", () =>
	import(/* webpackChunkName: "wasm-chunk" */ "./wasm-consumer.js").then(
		({ calculate }) => {
			expect(calculate()).toBe(44);
			const concatModules = __STATS__.modules.filter((m) => m.modules);
			expect(concatModules.length).toBe(1);
			const innerNames = concatModules[0].modules.map((m) => m.name);
			expect(innerNames).toEqual(
				expect.arrayContaining(["./wasm-consumer.js", "./wasm.wat"])
			);
			// Concat must not cross the dynamic-import chunk boundary:
			// the entry lives in the initial chunk, wasm-consumer/wasm.wat live
			// in the async `wasm-chunk`. They must stay in separate modules.
			const allInnerNames = concatModules.flatMap((m) =>
				m.modules.map((im) => im.name)
			);
			expect(allInnerNames).not.toContain("./index.js");
		}
	));
