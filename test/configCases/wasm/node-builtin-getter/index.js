it("should work", function() {
	return import("./module").then(function(module) {
		const result = module.run();
		expect(result).toEqual(84);
	});
});
