"use strict";

import { double } from "./esm";
import { early, parts, label, flag, pick, self } from "./walked";

const legacy = require("./legacy");
const cjs = require("./cjs");

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

it("should build each module from the walked syntax tree", () => {
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
	expect(typeof require("./esm")).toBe("object");
	return import("./esm").then((ns) => {
		expect(ns.double(3)).toBe(6);
	});
});
