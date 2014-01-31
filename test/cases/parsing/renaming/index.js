it("should be able to rename require by var", function() {
	var cjsRequire; // just to make it difficult
	var cjsRequire = require;
	cjsRequire("./file").should.be.eql("ok");
});

it("should be able to rename require by assign", function() {
	var cjsRequire;
	(function() {
		cjsRequire = require;
		cjsRequire("./file").should.be.eql("ok");
	}());
});

it("should be able to rename require by IIFE", function() {
	(function(cjsRequire) {
		cjsRequire("./file").should.be.eql("ok");
	}(require));
});

it("should be able to rename require by IIFE call", function() {
	(function(somethingElse, cjsRequire) {
		cjsRequire("./file").should.be.eql("ok");
		somethingElse.should.be.eql(123);
	}.call(this, 123, typeof require === "function" ? require : "error"));
});
