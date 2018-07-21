"use strict";

it("should find var declaration in control statements", function() {
	var f = (function(x) {
		x.should.be.eql("fail");
	});

	(function() {
		for(let x of ["a"]) {
			var require = f;
		}

		require("fail");
	}());
});

it("should find var declaration in control statements after usage", function() {
	var f = (function(x) {
		x.should.be.eql("fail");
	});

	(function() {
		var test = (function() { require("fail"); });

		for(let x of ["a"]) {
			var require = f;
		}

		test();
	}());
});
