const esm1 = require("./esm1");

expect(esm1.default).toBe("esm1");

it("Shouldn't eliminate hoisted function in current block scope", () => {
	expect(() => {
		funcDecl;
	}).not.toThrow();

	funcDecl();
	if (true) return;
	function funcDecl() {}
	import("./esm3").then(() => {
		expect(true).toBe(false);
	});
});

it("Shouldn't eliminate hoisted variable", () => {
	expect(() => {
		varDecl;
	}).not.toThrow();
	try {
		throw new Error();
	} catch (e) {
		return;
	}
	var varDecl = "foo";
	expect(true).toBe(false);
	import("./esm3").then(() => {
		expect(true).toBe(false);
	});
});

it("Shouldn't eliminate hoisted variable (more complex). From test/configCases/parsing/issue-4857/index.js", () => {
	expect(() => {
		a;
		b;
		c;
		d;
		e;
		f;
		g;
		h;
		i;
		j;
		k;
		l;
		m;
		n;
		o;
	}).not.toThrow();
	expect(() => {
		withVar;
	}).toThrow();
	try {
	} finally {
		return;
	}
	expect(true).toBe(false);
	var a,
		[, , b] = [],
		{ c, D: d, ["E"]: e = 2 } = {};
	var [{ ["_"]: f }, ...g] = [];
	do {
		switch (g) {
			default:
				var h;
				break;
		}
		loop: for (var i; ; ) for (var j in {}) for (var k of {}) break;
		try {
			var l;
		} catch (e) {
			var m;
		} finally {
			var n;
		}
		{
			var o;
		}
	} while (true);
	with (o) {
		var withVar;
	}
	import("./esm3").then(() => {
		expect(true).toBe(false);
	});
});

it("Should eliminate hoisted function in strict mode", () => {
	"use strict";
	expect(() => {
		funcDecl;
	}).toThrow();

	if (true) return;

	{
		function funcDecl() {}
		expect(true).toBe(false);
	}
});

it("Shouldn't eliminate hoisted function in sloppy mode", () => {
	expect(() => {
		funcDecl;
	}).not.toThrow();
	if (true) return;
	{
		function funcDecl() {}
		expect(true).toBe(false);
	}
});
if (true) {
	return;
}
// We won't terminate in top level scope although it won't run.
require("./esm2");
