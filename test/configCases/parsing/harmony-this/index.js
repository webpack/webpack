"use strict";

import {extendThisClass, returnThisArrow, returnThisMember, that} from "./abc";
import d, {a, b as B, C as _C, D as _D, E, F, f1, f2, f3, G} from "./abc";

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
	expect(function() {
		extendThisClass();
	}).toThrowError();
});

it("should not break classes and functions", function() {
	expect((new _C).foo()).toBe("bar");
	expect((new _C).bar()).toBe("bar");
	expect((new _D).prop()).toBe("ok");
	expect(E.foo()).toBe("bar");
	expect(F).toBe("ok");
	expect(f1.call({x: "f1"})).toBe("f1");
	expect(f2.call({x: "f2"})).toBe("f2");
	expect(f3.call("f3")).toBe(undefined);
	expect(f3()).toBe(undefined);
	expect((new G("ok")).getX()).toBe("ok");
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
	expect(abc.a()).toBeTypeOf("object");
	x
	var thing = abc.a();
	expect(Object.keys(thing)).toEqual(Object.keys(abc));
});

import C2, { C } from "./new";

import * as New from "./new";

it("should be possible to use new correctly", function() {
	x
	expect(new C()).toEqual({ok: true});
	x
	expect(new C2()).toEqual({ok: true});
	x
	expect(new New.C()).toEqual({ok: true});
});
