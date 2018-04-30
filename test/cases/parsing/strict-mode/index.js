"use strict";
define(["./abc"], function(abc) {
	// AMD is used here, because it adds stuff to the top of the code
	// we make sure to keep strict mode

	var a = abc.default;

	it("should keep strict mode", function() {
		var x = (function() {
			return this;
		})();
		(typeof x).should.be.eql("undefined");
	});

	it("should import modules in strict mode", function() {
		a().should.be.eql("undefined");
	});

});