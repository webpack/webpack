it("should create dependency when require is called with 'new' (object export)", function() {
	const result = new require("./object-export");
	result.foo.should.equal("bar");
});

it("should create dependency when require is called with 'new' (non-object export)", function() {
	const sideEffect = require("./sideEffect");
	const result = new require("./non-object-export");
	result.should.instanceof(__webpack_require__);
	sideEffect.foo.should.equal("bar");
});
