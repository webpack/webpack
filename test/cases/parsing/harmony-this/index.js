"use strict";

import sd, {sa, sb as SB} from "./strict-abc";

import * as sabc from "./strict-abc";

import d, {a, b as B} from "./abc";

import * as abc from "./abc";

function x() { throw new Error("should not be executed"); }
it("should have this = undefined on imported strict functions", function() {
	(typeof sd()).should.be.eql("undefined");
	(typeof sa()).should.be.eql("undefined");
	(typeof SB()).should.be.eql("undefined");
	x
	sabc.sa().should.be.eql(sabc);
});

it("should have this = global on imported non-strict functions", function() {
	x
	d().should.be.eql(global);
	x
	a().should.be.eql(global);
	x
	B().should.be.eql(global);
	x
	abc.a().should.be.eql(abc);
	x
});

import C2, { C } from "./new";

import * as New from "./new";

it("should be possible to use new correctly", function() {
	x
	new C().should.be.eql({ok: true});
	x
	new C2().should.be.eql({ok: true});
	x
	new New.C().should.be.eql({ok: true});
});
