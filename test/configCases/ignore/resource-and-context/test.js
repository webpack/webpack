/* globals it */
"use strict";

it("should ignore resources that match resource regex and context", function() {
	expect(function() {
		require("./folder-b/normal-module");
	}).toThrowError();
});

it("should not ignore resources that match resource but not context", function() {
	expect(function() {
		require("./folder-a/normal-module");
	}).not.toThrowError();
});

it("should not ignore resources that do not match resource but do match context", function() {
	expect(function() {
		require("./folder-b/only-context-match");
	}).not.toThrowError();
});
