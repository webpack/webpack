it("should create dedicated wasm module classes", () =>
	import("./async.wat").then((asyncWasm) => {
		expect(asyncWasm.add(1, 2)).toBe(3);
		return import("./sync.wat").then((syncWasm) => {
			expect(syncWasm.add(3, 4)).toBe(7);
		});
	}));
