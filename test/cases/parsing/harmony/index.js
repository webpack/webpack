import {a, b as B} from "abc";

import * as abc from "abc";

import { fn } from "exportKinds";

import { one, two } from "exportKinds";

import { test1, test2 } from "exportKinds";

import { a as rea, b as reb, c as rec, o as reo, two as retwo, def as Thing3 } from "reexport";
import { a as rea2 } from "reexport2";

import threeIsOdd, { even } from "circularEven";

import { specA, specB } from "exports-specifier";

import Thing, { Other } from "commonjs";
import * as commonjs from "commonjs";
import Thing2, { Other as Other2 } from "commonjs-trans";
import * as commonjsTrans from "commonjs-trans";

import defaultExport from "def";

import "unused";


it("should import a default export from a module", function() {
	defaultExport.should.be.eql("def");
});

it("should import an identifier from a module", function() {
	a.should.be.eql("a");
	B.should.be.eql("b");
});

it("should import a whole module", function() {
	abc.a.should.be.eql("a");
	abc.b.should.be.eql("b");
	abc.c.should.be.eql("c");
	abc.d.c.should.be.eql("c");
	abc.e.should.be.eql("c");
	var copy = (function(a) { return a; }(abc));
	copy.a.should.be.eql("a");
	copy.b.should.be.eql("b");
	copy.c.should.be.eql("c");
	copy.d.c.should.be.eql("c");
	copy.e.should.be.eql("c");
	(typeof abc).should.be.eql("object");
});

it("should export functions", function() {
	fn.should.have.type("function");
	fn().should.be.eql("fn");
	(fn === fn).should.be.eql(true);
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
	rea2.should.be.eql("a");
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
	x
	Thing().should.be.eql("thing");
	x
	Other.should.be.eql("other");

	Thing2.should.have.type("function");
	new Thing2().value.should.be.eql("thing");
	Other2.should.be.eql("other");
	Thing3().should.be.eql("thing");
});

it("should be able to import commonjs with star import", function() {
	var copyOfCommonjs = commonjs;
	commonjs().should.be.eql("thing");
	commonjs.Other.should.be.eql("other");
	copyOfCommonjs().should.be.eql("thing");
	copyOfCommonjs.Other.should.be.eql("other");
	var copyOfCommonjsTrans = commonjsTrans;
	new commonjsTrans.default().value.should.be.eql("thing");
	commonjsTrans.Other.should.be.eql("other");
	new copyOfCommonjsTrans.default().value.should.be.eql("thing");
	copyOfCommonjsTrans.Other.should.be.eql("other");
});
