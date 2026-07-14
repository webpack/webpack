it("should keep async output for top-level for-await (not generator-lowered)", () =>
	import("./mod.js").then(({ sum }) => {
		expect(sum).toBe(3);
	}));
