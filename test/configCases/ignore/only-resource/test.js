/* globals it */
"use strict";

it("should ignore ignored resources", function() {
	(function() {
		require("./ignored-module");
	}).should.throw();
});
it("should not ignore resources that do not match", function() {
	(function() {
		require("./normal-module");
	}).should.not.throw();
});
