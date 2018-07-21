/* globals it */
"use strict";

it("should ignore ignored resources", function() {
	const folderBContext = function(mod) {
		require("./src/" + mod);
	};

	(function() {
		folderBContext("ignored-module");
	}).should.throw();
});
it("should not ignore resources that do not match", function() {
	const folderBContext = function(mod) {
		require("./src/" + mod);
	};

	(function() {
		folderBContext("normal-module");
	}).should.not.throw();
});
