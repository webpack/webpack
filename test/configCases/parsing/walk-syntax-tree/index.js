"use strict";

import { double } from "./esm";
import { early, parts, label, flag, pick, self } from "./walked";

const legacy = require("./legacy");
const cjs = require("./cjs");
const members = require("./members").read();
const callMember = require("./cjs").value;
const literal = require("./literal");
const destructure = require("./destructure");
const iife = require("./iife");
const templates = require("./templates");

if (true) {
	function hoisted() {
		return 2;
	}
	var outer = hoisted();
}

class Counter {
	constructor() {
		this.count = 0;
	}
}

const { a, b: [c] } = { a: 1, b: [3] };

// walked, never run: its tap parses another source in the middle of this one
function nested() {
	nestedParse(/*#__PURE__*/ make());
}

it("should build each module from the walked syntax tree", () => {
	expect([literal.a(), literal.b, literal.c]).toEqual([1, 2, 3]);
	expect(double(2)).toBe(4);
	expect(cjs.value).toBe(42);
	expect(legacy.read({ x: 7 })).toBe(7);
	expect(outer).toBe(2);
	expect(new Counter().count).toBe(0);
	expect([a, c]).toEqual([1, 3]);
	expect(parts).toEqual([1, 2, 3]);
	expect(label).toBe("1-3");
	expect(flag).toBe(true);
	expect(pick(1)).toBe("one");
	expect(() => pick(2)).toThrow("two");
	expect(pick(3)).toBe("many");
	expect(self.call(parts)).toBe(parts);
	expect(early()).toBe(1);
	expect(members).toEqual({
		member: 3,
		callRooted: 4,
		computed: 2,
		shorthand: "b",
		nested: [2, 15, 6],
		meta: "object",
		voided: "undefined"
	});
	expect(callMember).toBe(42);
	expect(templates).toEqual({
		viaTemplate: 42,
		viaMerged: 42,
		viaRaw: 42,
		viaMethods: 42,
		viaConcat: 42,
		viaIndex: 42,
		viaSequence: 42,
		merged: "abcnumberd",
		raw: "x\\ny",
		tagged: "p|q:10",
		scoped: true
	});
	expect(iife).toEqual({
		viaCall: [42, 1, "this"],
		viaBind: 2,
		direct: [42, "function"],
		arrow: 12,
		unbound: 5,
		notSimple: 6,
		unused: [7, "undefined"]
	});
	expect(destructure.twice(2)).toBe(4);
	expect([destructure.value, destructure.extra, destructure.assigned]).toEqual([
		42, 1, 42
	]);
	expect([destructure.inner, destructure.outer, destructure.rest]).toEqual([
		42, 42, 42
	]);
	expect([destructure.first, destructure.third, destructure.tail]).toEqual([
		1,
		3,
		[4]
	]);
	expect([destructure.deep, destructure.shallow]).toEqual([5, 6]);
	expect(new destructure.Local()).toBeInstanceOf(destructure.Local);
	expect(destructure.params({ a: 1, k1: 4, m: 5 }, [6, 7, 8, 9])).toEqual([
		1,
		2,
		4,
		{ m: 5 },
		6,
		[8, 9],
		3
	]);
	expect(destructure.named({}, 2)).toEqual([1, 2, "function"]);
	expect(require("./box").box.value).toBe(7);
	expect(typeof require("./esm")).toBe("object");
	return import("./esm").then((ns) => {
		expect(ns.double(3)).toBe(6);
	});
});
