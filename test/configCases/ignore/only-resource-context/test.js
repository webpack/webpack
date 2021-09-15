/* globals it */
"use strict";

it("should ignore ignored resources", function() {
	const folderBContext = function(mod) {
		require("./src/" + mod);
	};

	expect(function() {
		folderBContext("ignored-module");
	}).toThrowError();
});
it("should not ignore resources that do not match", function() {
	const folderBContext = function(mod) {
		require("./src/" + mod);
	};

	expect(function() {
		folderBContext("normal-module");
	}).not.toThrowError();
});
