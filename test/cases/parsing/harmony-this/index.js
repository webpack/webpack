"use strict";

import d, {a, b as B} from "./abc";

import * as abc from "./abc";

function x() { throw new Error("should not be executed"); }
it("should have this = undefined on imported non-strict functions", function() {
	x
	expect(d()).toEqual("undefined");
	x
	expect(a()).toEqual("undefined");
	x
	expect(B()).toEqual("undefined");
	x
	expect(abc.a()).toEqual(abc);
	x
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
