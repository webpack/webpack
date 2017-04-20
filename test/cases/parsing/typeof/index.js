it("should not create a context for typeof require", function() {
	expect(require("./typeof")).toEqual("function");
});

it("should answer typeof require correctly", function() {
	expect((typeof require)).toEqual("function");
});
it("should answer typeof define correctly", function() {
	expect((typeof define)).toEqual("function");
});
it("should answer typeof require.amd correctly", function() {
	expect((typeof require.amd)).toEqual("object");
});
it("should answer typeof define.amd correctly", function() {
	expect((typeof define.amd)).toEqual("object");
});
it("should answer typeof module correctly", function() {
	expect((typeof module)).toEqual("object");
});
it("should answer typeof exports correctly", function() {
	expect((typeof exports)).toEqual("object");
});
it("should answer typeof require.include correctly", function() {
	expect((typeof require.include)).toEqual("function");
});
it("should answer typeof require.ensure correctly", function() {
	expect((typeof require.ensure)).toEqual("function");
});
it("should answer typeof System correctly", function() {
	expect((typeof System)).toEqual("object");
});
it("should answer typeof System.import correctly", function() {
	expect((typeof System.import)).toEqual("function");
});


it("should not parse filtered stuff", function() {
	if(typeof require != "function") require("fail");
	if(typeof require !== "function") require("fail");
	if(!(typeof require == "function")) require("fail");
	if(!(typeof require === "function")) require("fail");
	if(typeof require == "undefined") require = require("fail");
	if(typeof require === "undefined") require = require("fail");
	if(typeof module == "undefined") module = require("fail");
	if(typeof module === "undefined") module = require("fail");
	if(typeof module != "object") module = require("fail");
	if(typeof exports == "undefined") exports = require("fail");
	if(typeof System !== "object") exports = require("fail");
	if(typeof System.import !== "function") exports = require("fail");
	if(typeof require.include !== "function") require.include("fail");
	if(typeof require.ensure !== "function") require.ensure(["fail"], function(){});
});
