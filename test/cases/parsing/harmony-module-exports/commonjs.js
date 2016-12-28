"use strict";

var harmony = require("./harmony");

it("has an 'exports' free var", function() {
	(typeof exports).should.equal("object");
});

it("has a 'module' free var", function() {
	(typeof module).should.equal("object");
});

it("has access to the 'module' shim", function() {
	var keyname = "loaded";
	module[keyname].should.be.false;
});

it("sees an __esModule key in the harmony export", function() {
	(typeof harmony.__esModule).should.not.be.undefined;
	harmony.__esModule.should.be.true;
})

it("can access the harmony exports", function() {
	(typeof harmony.default).should.equal("object");
	(harmony.default === null).should.be.true;
	(typeof harmony.foo).should.equal("function");
})
