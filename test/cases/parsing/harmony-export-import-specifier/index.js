"use strict";

import { x, y } from "./a";
import { d2, usedD1, usedD2 } from "./d.js";
import { b1, usedB1, usedB2, usedB3, usedB4 } from "./b.js";
import { usedE1, usedE2 } from "./e.js";
import { h } from "./h.js";
import * as m from "./m";
import * as o from "./o";
import * as p from "./p";

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
	const obj = { a: "a" in m };
	expect(obj.a).toBe(true);
	expect("a" in o).toBe(true);
	expect("a" in p).toBe(false);
	expect("c" in m).toBe(false);
	expect("c" in (false ? ({}) : m.d)).toBe(true);
	expect("d" in m.d).toBe(false);
	if (process.env.NODE_ENV === "production") {
		expect(m.d.usedA).toBe(false);
		expect(m.usedB).toBe(false);
		expect(m.usedA).toBe(true);
		expect(m.canMangleA).toBe(true);
	}
});
