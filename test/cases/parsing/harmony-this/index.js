"use strict";

import d, {a, b as B} from "./abc";

import * as abc from "./abc";

function x() { throw new Error("should not be executed"); }
it("should have this = undefined on imported non-strict functions", function() {
	x
	d().should.be.eql("undefined");
	x
	a().should.be.eql("undefined");
	x
	B().should.be.eql("undefined");
	x
	abc.a().should.be.eql(abc);
	x
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
