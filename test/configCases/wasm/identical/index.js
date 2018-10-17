it("should allow reference the same wasm multiple times", function() {
	return import("./module").then(function(module) {
		const result = module.run();
		expect(result).toEqual(84);
	});
});

it("should allow reference the same wasm multiple times (other chunk)", function() {
	return import("./module?2").then(function(module) {
		const result = module.run();
		expect(result).toEqual(84);
	});
});
