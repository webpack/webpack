it("should still defer the module in its own runtime", () =>
	import("./shared").then((module) => {
		expect(module.shared).toBe(1);
	}));
