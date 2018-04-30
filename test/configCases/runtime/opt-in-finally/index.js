it("should throw exception on every try to load a module", function() {
	(function() {
		require("./exception");
	}).should.throw();
	(function() {
		require("./exception");
	}).should.throw();
});
