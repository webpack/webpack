it("should concatenate sync wasm modules with their consumers", () =>
	import(/* webpackChunkName: "wasm-chunk" */ "./wasm-consumer.js").then(
		({ calculate }) => {
			expect(calculate()).toBe(42);
			// The wasm-consumer.js and wasm.wat modules end up in the same async
			// chunk; with wasm-sync concatenation enabled, they fold into a single
			// concatenated module.
			const concatModules = __STATS__.modules.filter((m) => m.modules);
			expect(concatModules.length).toBe(1);
			expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(2);
		}
	));
