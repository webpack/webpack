it("should not create a context for typeof require", function() {
	require("./typeof").should.be.eql("function");
});

it("should answer typeof require correctly", function() {
	(typeof require).should.be.eql("function");
});
it("should answer typeof define correctly", function() {
	(typeof define).should.be.eql("function");
});
it("should answer typeof require.amd correctly", function() {
	(typeof require.amd).should.be.eql("object");
});
it("should answer typeof define.amd correctly", function() {
	(typeof define.amd).should.be.eql("object");
});
it("should answer typeof module correctly", function() {
	(typeof module).should.be.eql("object");
});
it("should answer typeof exports correctly", function() {
	(typeof exports).should.be.eql("object");
});
it("should answer typeof require.include correctly", function() {
	(typeof require.include).should.be.eql("function");
});
it("should answer typeof require.ensure correctly", function() {
	(typeof require.ensure).should.be.eql("function");
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
	if(typeof require.include !== "function") require.include("fail");
	if(typeof require.ensure !== "function") require.ensure(["fail"], function(){});
});
