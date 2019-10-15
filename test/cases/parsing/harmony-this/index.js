"use strict"

import d, {a, b as B} from "./abc"

import * as abc from "./abc"

function x() { throw new Error("should not be executed"); }
it("should have this = undefined on imported non-strict functions", function() {
	if(true) x
	d().toBe("undefined")
	x
	a().toBe("undefined")
	x
	B().toBe("undefined")
})

import C2, { C } from "./new"

import * as New from "./new"

it("should be possible to use new correctly", function() {
	x
	new C().ok.toEqual(true)
	x
	new C2().ok.toEqual(true)
	x
	new New.C().ok.toEqual(true)
})
