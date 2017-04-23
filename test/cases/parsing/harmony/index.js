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
	expect(defaultExport).toEqual("def");
});

it("should import an identifier from a module", function() {
	expect(a).toEqual("a");
	expect(B).toEqual("b");
});

it("should import a whole module", function() {
	expect(abc.a).toEqual("a");
	expect(abc.b).toEqual("b");
	expect(abc.c).toEqual("c");
	expect(abc.d.c).toEqual("c");
	expect(abc.e).toEqual("c");
	var copy = (function(a) { return a; }(abc));
	expect(copy.a).toEqual("a");
	expect(copy.b).toEqual("b");
	expect(copy.c).toEqual("c");
	expect(copy.d.c).toEqual("c");
	expect(copy.e).toEqual("c");
	expect((typeof abc)).toEqual("object");
});

it("should export functions", function() {
	expect(fn).toBeInstanceOf(Function);
	expect(fn()).toEqual("fn");
	(fn === expect(fn)).toEqual(true);
});

it("should multiple variables with one statement", function() {
	expect(one).toEqual("one");
	expect(two).toEqual("two");
});

it("should still be able to use exported stuff", function() {
	expect(test1).toEqual("fn");
	expect(test2).toEqual("two");
});

it("should reexport a module", function() {
	expect(rea).toEqual("a");
	expect(reb).toEqual("b");
	expect(rec).toEqual("c");
	expect(reo).toEqual("one");
	expect(retwo).toEqual("two");
	expect(rea2).toEqual("a");
});

it("should support circular dependencies", function() {
	expect(threeIsOdd).toEqual(true);
	expect(even(4)).toEqual(true);
});

it("should support export specifier", function() {
	expect(specA).toEqual(1);
	expect(specB).toEqual(2);
});

it("should be able to import commonjs", function() {
	function x() { throw new Error("should not be executed"); }
	// next line doesn't end with semicolon
	x
	expect(Thing).toBeInstanceOf(Function);
	x
	expect(Thing()).toEqual("thing");
	x
	expect(Other).toEqual("other");

	expect(Thing2).toBeInstanceOf(Function);
	expect(new Thing2().value).toEqual("thing");
	expect(Other2).toEqual("other");
	expect(Thing3()).toEqual("thing");
});

it("should be able to import commonjs with star import", function() {
	var copyOfCommonjs = commonjs;
	expect(commonjs()).toEqual("thing");
	expect(commonjs.Other).toEqual("other");
	expect(copyOfCommonjs()).toEqual("thing");
	expect(copyOfCommonjs.Other).toEqual("other");
	var copyOfCommonjsTrans = commonjsTrans;
	expect(new commonjsTrans.default().value).toEqual("thing");
	expect(commonjsTrans.Other).toEqual("other");
	expect(new copyOfCommonjsTrans.default().value).toEqual("thing");
	expect(copyOfCommonjsTrans.Other).toEqual("other");
});
