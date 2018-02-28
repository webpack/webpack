"use strict";

import d, {a, b as B, C as _C, D as _D, extendThisClass, returnThisArrow, returnThisMember, that} from "./abc";

import * as abc from "./abc";

it("should have this = undefined on harmony modules", function() {
	(typeof that).should.be.eql("undefined");
	(typeof abc.that).should.be.eql("undefined");
	(typeof returnThisArrow()).should.be.eql("undefined");
	(typeof abc.returnThisArrow()).should.be.eql("undefined");
	(function() {
		returnThisMember();
	}).should.throw();
	(function() {
		abc.returnThisMember();
	}).should.throw();
	(function() {
		extendThisClass();
	}).should.throw();
});

it("should not break classes and functions", function() {
	(new _C).foo().should.be.eql("bar");
	(new _C).bar().should.be.eql("bar");
	(new _D).prop().should.be.eql("ok");
});

function x() { throw new Error("should not be executed"); }
it("should have this = undefined on imported non-strict functions", function() {
	x
	d().should.be.eql("undefined");
	x
	a().should.be.eql("undefined");
	x
	B().should.be.eql("undefined");
	x
	abc.a().should.be.type("object");
	x
	var thing = abc.a();
	Object.keys(thing).should.be.eql(Object.keys(abc));
});

import C2, { C } from "./new";

import * as New from "./new";

it("should be possible to use new correctly", function() {
	x
	new C().should.match({ok: true});
	x
	new C2().should.match({ok: true});
	x
	new New.C().should.match({ok: true});
});
