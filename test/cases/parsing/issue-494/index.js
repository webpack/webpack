it("should replace a free var in a IIFE", function() {
	(function(md) {
		md.should.be.type("function");
	}(module.deprecate));
});