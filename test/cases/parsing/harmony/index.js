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
	expect(defaultExport).toBe("def");
});

it("should import an identifier from a module", function() {
	expect(a).toBe("a");
	expect(B).toBe("b");
});

it("should import a whole module", function() {
	expect(abc.a).toBe("a");
	expect(abc.b).toBe("b");
	expect(abc.c).toBe("c");
	expect(abc.d.c).toBe("c");
	expect(abc.e).toBe("c");
	var copy = (function(a) { return a; }(abc));
	expect(copy.a).toBe("a");
	expect(copy.b).toBe("b");
	expect(copy.c).toBe("c");
	expect(copy.d.c).toBe("c");
	expect(copy.e).toBe("c");
	expect((typeof abc)).toBe("object");
	expect("" + abc).toBe("[object Module]");
});

it("should export functions", function() {
	expect(fn).toBeTypeOf("function");
	expect(fn()).toBe("fn");
	expect((fn === fn)).toBe(true);
});

it("should multiple variables with one statement", function() {
	expect(one).toBe("one");
	expect(two).toBe("two");
});

it("should still be able to use exported stuff", function() {
	expect(test1).toBe("fn");
	expect(test2).toBe("two");
});

it("should reexport a module", function() {
	expect(rea).toBe("a");
	expect(reb).toBe("b");
	expect(rec).toBe("c");
	expect(reo).toBe("one");
	expect(retwo).toBe("two");
	expect(rea2).toBe("a");
});

it("should support circular dependencies", function() {
	expect(threeIsOdd).toBe(true);
	expect(even(4)).toBe(true);
});

it("should support export specifier", function() {
	expect(specA).toBe(1);
	expect(specB).toBe(2);
});

it("should be able to import commonjs", function() {
	function x() { throw new Error("should not be executed"); }
	// next line doesn't end with semicolon
	x
	Thing
	expect(Thing).toBeTypeOf("function");
	x
	Thing()
	expect(Thing()).toBe("thing");
	x
	Other
	expect(Other).toBe("other");

	expect(Thing2).toBeTypeOf("function");
	expect(new Thing2().value).toBe("thing");
	expect(Other2).toBe("other");
	expect(Thing3()).toBe("thing");
});

it("should be able to import commonjs with star import", function() {
	var copyOfCommonjs = commonjs;
	expect(commonjs()).toBe("thing");
	expect(commonjs.Other).toBe("other");
	expect(copyOfCommonjs()).toBe("thing");
	expect(copyOfCommonjs.Other).toBe("other");
	var copyOfCommonjsTrans = commonjsTrans;
	expect(new commonjsTrans.default().value).toBe("thing");
	expect(commonjsTrans.Other).toBe("other");
	expect(new copyOfCommonjsTrans.default().value).toBe("thing");
	expect(copyOfCommonjsTrans.Other).toBe("other");
});
