/* globals it */
"use strict";

it("should ignore context modules that match resource regex and context", function() {
	const folderBContext = function(mod) {
		require("./folder-b/" + mod);
	};

	expect(function() {
		folderBContext("normal-module");
	}).toThrow();
});

it("should not ignore context modules that do not match the resource", function() {
	const folderBContext = function(mod) {
		require("./folder-b/" + mod);
	};

	expect(function() {
		folderBContext("only-context-match");
	}).not.toThrow();
});

it("should not ignore context modules that do not match the context", function() {
	const folderBContext = function(mod) {
		require("./folder-a/" + mod);
	};

	expect(function() {
		folderBContext("normal-module");
	}).not.toThrow();
	expect(function() {
		folderBContext("ignored-module");
	}).not.toThrow();
});
