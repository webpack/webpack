it("should warn: 'a' is loaded first, so nothing is deferred", () =>
	import("./shared").then((module) => {
		expect(module.shared).toBe(1);
	}));
