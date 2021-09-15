it("should allow to run a WebAssembly module importing from multiple modules", function() {
	return import("./module").then(function(mod) {
		expect(mod.result).toBe(42);
	});
});
