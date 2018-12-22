/* globals it */
"use strict";

it("should ignore ignored resources 1", function() {
	expect(function() {
		require("./ignored-module1");
	}).toThrowError();
});
it("should ignore ignored resources 2", function() {
	expect(function() {
		require("./ignored-module2");
	}).toThrowError();
});
it("should not ignore resources that do not match", function() {
	expect(function() {
		require("./normal-module");
	}).not.toThrowError();
});
