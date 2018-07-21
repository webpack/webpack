/* globals it */
"use strict";

it("should ignore context modules that match resource regex and context", function() {
	const folderBContext = function(mod) {
		require("./folder-b/" + mod);
	};

	(function() {
		folderBContext("normal-module");
	}).should.throw();
});

it("should not ignore context modules that dont match the resource", function() {
	const folderBContext = function(mod) {
		require("./folder-b/" + mod);
	};

	(function() {
		folderBContext("only-context-match");
	}).should.not.throw();
});

it("should not ignore context modules that dont match the context", function() {
	const folderBContext = function(mod) {
		require("./folder-a/" + mod);
	};

	(function() {
		folderBContext("normal-module");
	}).should.not.throw();
	(function() {
		folderBContext("ignored-module");
	}).should.not.throw();
});
