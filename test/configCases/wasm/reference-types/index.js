it("should work", function() {
	return import("./pkg/wasm_lib.js").then(function(module) {
		console.log(module)
		// const result = module.run();
		// expect(result).toEqual(84);
	});
});
