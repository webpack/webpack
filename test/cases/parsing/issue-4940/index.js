define("local-module-object", function () {
	return {
		foo: "bar"
	};
});

define("local-side-effect", function () {
	return {
		foo: null
	};
});

define("local-module-non-object", ["local-side-effect"], function (sideEffect) {
	sideEffect.foo = "bar"
	return 1;
});

it("should create dependency when require is called with 'new' (object export)", function() {
	const result = new require("./object-export");
	result.foo.should.equal("bar");
	result.should.equal(require("./object-export"));
});

it("should create dependency when require is called with 'new' (non-object export)", function() {
	const sideEffect = require("./sideEffect");
	const result = new require("./non-object-export");
	result.should.instanceof(__webpack_require__);
	sideEffect.foo.should.equal("bar");
	result.should.not.equal(require("./non-object-export"));
});

it("should create dependency with 'new' on a local dependency (object export)", function() {
	const result = new require("local-module-object");
	result.foo.should.equal("bar");
	result.should.equal(require("local-module-object"));
});

it("shouldn't fail with a local dependency (non-object export)", function() {
	const sideEffect = require("local-side-effect");
	const result = new require("local-module-non-object");
	result.should.not.equal(1);
	sideEffect.foo.should.equal("bar");
	result.should.not.equal(require("local-module-non-object"));
});

it("should work with 'require' in parentheses", function () {
	const result = new (require)("./object-export");
	result.foo.should.equal("bar");
});

it("should work with local module 'require' in parentheses", function () {
	const result = new (require)("local-module-object");
	result.foo.should.equal("bar");
});

it("shouldn't fail with non-object local module 'require' in parentheses", function () {
	new (require)("local-module-non-object");
});
