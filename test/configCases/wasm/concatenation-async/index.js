it("should concatenate async wasm modules with their consumers", () =>
	import(/* webpackChunkName: "wasm-chunk" */ "./wasm-consumer.js").then(
		({ calculate }) => {
			expect(calculate()).toBe(44);
			const concatModules = __STATS__.modules.filter((m) => m.modules);
			expect(concatModules.length).toBe(1);
			expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(2);
		}
	));
