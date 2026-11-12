/* globals it */
"use strict";

it("should ignore every match of a global regexp", function() {
	expect(function() {
		require("./ignored-module-a");
	}).toThrow();
	expect(function() {
		require("./ignored-module-b");
	}).toThrow();
	expect(function() {
		require("./ignored-module-c");
	}).toThrow();
});
