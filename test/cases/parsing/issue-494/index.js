it("should replace a free var in a IIFE", function() {
	(function(md) {
		expect(md).toBeTypeOf("function");
	}(module.deprecate));
});
