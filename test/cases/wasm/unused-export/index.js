it("should allow wasm with unused exports", function() {
	return import("./module").then(function(module) {
		const result = module.run();
		expect(result).toEqual(42);
	});
});
