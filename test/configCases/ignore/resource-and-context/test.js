/* globals it */
"use strict";

it("should ignore resources that match resource regex and context", function() {
	(function() {
		require("./folder-b/normal-module");
	}).should.throw();
});

it("should not ignore resources that match resource but not context", function() {
	(function() {
		require("./folder-a/normal-module");
	}).should.not.throw();
});

it("should not ignore resources that do not match resource but do match context", function() {
	(function() {
		require("./folder-b/only-context-match");
	}).should.not.throw();
});
