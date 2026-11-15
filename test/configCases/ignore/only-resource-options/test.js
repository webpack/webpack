/* globals it */
"use strict";

it("should ignore ignored resources", function() {
	expect(function() {
		require("./ignored-module");
	}).toThrow();
});
it("should not ignore resources that do not match", function() {
	expect(function() {
		require("./normal-module");
	}).not.toThrow();
});
