import {a, b as B} from "abc";

import * as abc from "abc";

import { fn } from "exportKinds";

import { one, two } from "exportKinds";

import { test1, test2 } from "exportKinds";

import { a as rea, b as reb, c as rec, o as reo, two as retwo } from "reexport";

import threeIsOdd, { even } from "circularEven";

import { specA, specB } from "exports-specifier";

import Thing, { Other } from "commonjs";
import Thing2, { Other as Other2 } from "commonjs-trans";


it("should import an identifier from a module", function() {
	a.should.be.eql("a");
	B.should.be.eql("b");
});

it("should import a whole module", function() {
	abc.a.should.be.eql("a");
	abc.b.should.be.eql("b");
	var copy = (function(a) { return a; }(abc));
	copy.a.should.be.eql("a");
	copy.b.should.be.eql("b");
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

it("should support circular dependencies", function() {
	threeIsOdd.should.be.eql(true);
	even(4).should.be.eql(true);
});

it("should support export specifier", function() {
	specA.should.be.eql(1);
	specB.should.be.eql(2);
});

it("should be able to import commonjs", function() {
	function x() { throw new Error("should not be executed"); }
	// next line doesn't end with semicolon
	x
	Thing.should.have.type("function");
	Thing().should.be.eql("thing");
	Other.should.be.eql("other");

	Thing2.should.have.type("function");
	new Thing2().value.should.be.eql("thing");
	Other2.should.be.eql("other");
});
