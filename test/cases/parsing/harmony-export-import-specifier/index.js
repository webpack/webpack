"use strict";

import { x, y } from "./a";
import { d2, usedD1, usedD2 } from "./d.js";
import { b1, usedB1, usedB2, usedB3, usedB4 } from "./b.js";
import { usedE1, usedE2 } from "./e.js";
import { h } from "./h.js";
import * as m from "./m";
import { object as obj } from "./m";
import cjs from "./cjs2";
import * as o from "./o";
import * as p from "./p";
import * as q from "./q";
import * as so from "./side-effect-free/o";
import * as sm from "./side-effect-free/m";
import json1 from "./some.json";
import json2 from "./some1.json";
import weirdCjs from "./weird-cjs";

it("namespace export as from commonjs should override named export", function () {
	expect(x).toBe(1);
	expect(y).toBe(3);
});

it("named namespace export should work correctly", function () {
	expect(d2).toBe(2);
	if (process.env.NODE_ENV === "production") {
		expect(usedD1).toBe(false);
	}
	expect(usedD2).toBe(true);

	expect(b1.d2).toBe(2);
	expect(usedB1).toBe(true);
	if (process.env.NODE_ENV === "production") {
		expect(usedB2).toBe(false);
		expect(usedB3).toBe(false);
		expect(usedB4).toBe(false);
	}
});

it("complex case should work correctly", () => {
	expect(h.f1.e.e1).toBe(10);
	expect(h.g1.e1).toBe(10);
	expect(usedE1).toBe(true);
	if (process.env.NODE_ENV === "production") {
		expect(usedE2).toBe(false);
	}
});

it("should handle 'm in n' case", () => {
	const obj = { aaa: "aaa" in m };
	expect(obj.aaa).toBe(true);
	expect("not_here" in m.object).toBe(false);
	expect("not_here" in obj).toBe(false);
	expect("__esModule" in q).toBe(true);
	expect(() => "value" in q.__esModule).toThrow();
	expect(() => "not_here" in json1).toThrow();
	expect("not_here" in json2).toBe(false);
	expect("a" in json2).toBe(true);
	expect("a" in cjs).toBe(true);
	expect("not_here" in cjs).toBe(false);
	expect("not_here" in weirdCjs).toBe(false);
	expect("a" in weirdCjs).toBe(true);
	expect(() => "a" in weirdCjs.a).toThrow();
	expect("aaa" in o).toBe(true);
	expect("aaa" in p).toBe(false);
	expect("ccc" in m).toBe(false);
	expect("aaa" in q).toBe(true);
	expect("aaa" in so).toBe(true);
	expect("ccc" in sm).toBe(false);
	expect("ccc" in (false ? {} : m.ddd)).toBe(true);
	expect("ccc" in (false ? {} : sm.ddd)).toBe(true);
	expect("ddd" in m.ddd).toBe(false);
	expect("ddd" in sm.ddd).toBe(false);
	if (process.env.NODE_ENV === "production") {
		expect(m.ddd.usedA).toBe(false);
		expect(m.usedB).toBe(false);
		expect(m.usedA).toBe(true);
		expect(m.canMangleA).toBe(true);
	}
});

it("issue-15759", () => {
	function foo() {
		// PLEASE CONFIRM there is no space after return
		// prettier-ignore
		return"usedA"in m;
	}
	expect(foo.call()).toBe(true);
});
