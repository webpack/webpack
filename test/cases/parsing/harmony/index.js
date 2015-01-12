import {a, b as B} from "abc";

import * as abc from "abc";

import { fn } from "exportKinds";

import { one, two } from "exportKinds";

import { test1, test2 } from "exportKinds";

import { a as rea, b as reb, c as rec, o as reo, two as retwo } from "reexport";

it("should import an identifier from a module", function() {
	a.should.be.eql("a");
	B.should.be.eql("b");
});

it("should export functions", function() {
	fn.should.have.type("function");
	fn().should.be.eql("fn");
});

it("should multiple variables with one statement", function() {
	one.should.be.eql("one");
	two.should.be.eql("two");
});

it("should still be able to use exported stuff", function() {
	test1.should.be.eql("fn");
	test2.should.be.eql("two");
});

it("should reexport a module", function() {
	rea.should.be.eql("a");
	reb.should.be.eql("b");
	rec.should.be.eql("c");
	reo.should.be.eql("one");
	retwo.should.be.eql("two");
});
