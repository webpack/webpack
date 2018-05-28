/* globals it */
"use strict";

it("should ignore context modules that match resource regex and context", function() {
	const folderBContext = function(mod) {
		require("./folder-b/" + mod);
	};

	expect(function() {
		folderBContext("normal-module");
	}).toThrowError();
});

it("should not ignore context modules that dont match the resource", function() {
	const folderBContext = function(mod) {
		require("./folder-b/" + mod);
	};

	expect(function() {
		folderBContext("only-context-match");
	}).not.toThrowError();
});

it("should not ignore context modules that dont match the context", function() {
	const folderBContext = function(mod) {
		require("./folder-a/" + mod);
	};

	expect(function() {
		folderBContext("normal-module");
	}).not.toThrowError();
	expect(function() {
		folderBContext("ignored-module");
	}).not.toThrowError();
});
