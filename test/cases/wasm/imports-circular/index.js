it("should allow to run a WebAssembly module importing JS circular", function() {
	return import("./module").then(function(mod) {
		expect(mod.result).toBe(42);
	});
});
