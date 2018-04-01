it("should create dependency when require is called with 'new'", function() {
	const sideEffect = require("./sideEffect");
	new require("./module");
	sideEffect.foo.should.equal("bar");
});
