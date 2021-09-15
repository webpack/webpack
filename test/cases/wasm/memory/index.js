it("should allow direct memory connection between wasm modules", function() {
	return import("./run").then(function(module) {
		expect(module.x1).toBe(42);
		expect(module.x2).toBe(42);
		expect(module.y1).toBe(11);
		expect(module.y2).toBe(11);
	});
});
