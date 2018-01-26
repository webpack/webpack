"use strict";

import d, {a, b as B} from "./abc";

import * as abc from "./abc";

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
	expect(Object.keys(thing)).toEqual(["a", "b", "default"]);
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
