"use strict";

import d, {a, b as B, C as _C, D as _D, returnThisArrow, returnThisMember, that} from "./abc";

import * as abc from "./abc";

it("should have this = undefined on harmony modules", function() {
	expect((typeof that)).toBe("undefined");
	expect((typeof abc.that)).toBe("undefined");
	expect((typeof returnThisArrow())).toBe("undefined");
	expect((typeof abc.returnThisArrow())).toBe("undefined");
	expect(function() {
		returnThisMember();
	}).toThrowError();
	expect(function() {
		abc.returnThisMember();
	}).toThrowError();
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
	expect(abc.a()).toMatchObject({});
	x
	var thing = abc.a();
	expect(Object.keys(thing)).toBe(Object.keys(abc));
});

import C2, { C } from "./new";

import * as New from "./new";

it("should be possible to use new correctly", function() {
	x
	expect(new C()).toMatch({ok: true});
	x
	expect(new C2()).toMatch({ok: true});
	x
	expect(new New.C()).toMatch({ok: true});
});
