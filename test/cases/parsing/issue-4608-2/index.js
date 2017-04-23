"use strict";

it("should find var declaration in control statements", function() {
	var f = (function(x) {
		expect(x).toEqual("fail");
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
		expect(x).toEqual("fail");
	});

	(function() {
		var test = (function() { require("fail"); });

		for(let x of ["a"]) {
			var require = f;
		}

		test();
	}());
});
