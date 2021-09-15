/* globals it */
"use strict";

it("should ignore ignored resources", function() {
	expect(require("./ignored-module")).toEqual({});
});

it("should ignore ignored resources", function() {
	expect(require("ignored-module")).toEqual({});
});

it("should not ignore resources that do not match", function() {
	expect(require("./normal-module")).toBe("normal");
});
