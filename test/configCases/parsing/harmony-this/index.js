"use strict";

import d, {a, b as B, C as _C, D as _D, returnThisArrow, returnThisMember, that} from "./abc";

import * as abc from "./abc";

it("should have this = undefined on harmony modules", function() {
	expect((typeof that)).toBe("undefined");
	expect((typeof abc.that)).toBe("undefined");
	expect((typeof returnThisArrow())).toBe("undefined");
	expect((typeof abc.returnThisArrow())).toBe("undefined");
	(function() {
		returnThisMember();
	}).should.throw();
	(function() {
		abc.returnThisMember();
	}).should.throw();
});

it("should not break classes and functions", function() {
	expect((new _C).foo()).toBe("bar");
	expect((new _D).prop()).toBe("ok");
});

function x() { throw new Error("should not be executed"); }
it("should have this = undefined on imported non-strict functions", function() {
	x
	expect(d()).toBe("undefined");
	x
	expect(a()).toBe("undefined");
	x
	expect(B()).toBe("undefined");
	x
	abc.a().should.be.type("object");
	x
	var thing = abc.a();
	expect(Object.keys(thing)).toBe(Object.keys(abc));
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
