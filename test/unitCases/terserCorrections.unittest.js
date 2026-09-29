"use strict";

const vm = require("vm");
const { load } = require("../../lib/javascript/syntax").printer;
const { correctFits } = require("../../lib/javascript/terserCorrections");

/** @typedef {import("terser").MinifyOptions} MinifyOptions */

/**
 * @param {string} code a program
 * @returns {string} what it prints, or the error it throws
 */
const run = (code) => {
	/** @type {string[]} */
	const lines = [];
	try {
		vm.runInNewContext(code, {
			console: {
				log: (/** @type {unknown[]} */ ...values) =>
					lines.push(values.map((value) => String(value)).join(" "))
			}
		});
	} catch (err) {
		lines.push(`throws ${/** @type {Error} */ (err).name}`);
	}
	return lines.join("\n");
};

// Each prints one thing and terser's output another, under the options named.
/** @type {[string, string, MinifyOptions][]} */
const CASES = [
	[
		"a `{ __proto__ }` shorthand, printed",
		"var __proto__ = null; console.log(Object.getPrototypeOf({ __proto__ }) === Object.prototype);",
		{ compress: false, mangle: false }
	],
	[
		"a `{ __proto__ }` shorthand, its value inlined",
		"const __proto__ = 0; console.log(Object.keys({ __proto__ }));",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a `__proto__: __proto__` setter, printed as a shorthand",
		"var p = { a: 1 }; var __proto__ = p; console.log({ __proto__: __proto__ }.a);",
		{ compress: false, mangle: false, format: { shorthand: true } }
	],
	[
		"a spread object setting its prototype",
		"var p = { x: 1 }; console.log({ ...{ __proto__: p } }.x);",
		{ compress: {}, mangle: false }
	],
	[
		"a method read out of a getter's result, then called",
		"var r = { f() { return this === r; } }; console.log({ get: () => r.f }.get()());",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a method read out of a getter's result, then tagging a template",
		"var r = { f() { return this === r; } }; console.log({ get: () => r.f }.get()`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a conditional folded into a template's tag",
		"var r = { f() { return this === r; } }; var c = 1; console.log((c ? r.f : r.f)`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a logical expression folded into a template's tag",
		"var r = { f() { return this === r; } }; console.log((0 || r.f)`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a sequence detaching a template's tag",
		"var r = { f() { return this === r; } }; console.log((0, r.f)`x`);",
		{ compress: { toplevel: true }, mangle: false }
	],
	[
		"a method reading `this` through a direct `eval`",
		"console.log({ v: 1, f: function () { return eval('this').v; } }.f());",
		{ compress: {}, mangle: false }
	],
	[
		"`arguments[0]` where the parameter is reassigned and nothing passed",
		"function m(v) { v = 2; return arguments[0]; } console.log(m());",
		{ compress: { arguments: true }, mangle: false }
	],
	[
		"an empty arrow whose default has an effect",
		"var r = []; ((v = r.push(1)) => {})(); console.log(r.length);",
		{ compress: {}, mangle: false }
	],
	[
		"an empty function whose pattern throws",
		"var r = []; try { (function ([v]) {})(); } catch (e) { r.push(1); } console.log(r.length);",
		{ compress: {}, mangle: false }
	],
	[
		"a class after an early return, read by a closure",
		"function f(x) { var g = () => C; if (x) return; class C {} return g(); } console.log(typeof f(0));",
		{
			compress: { inline: false, reduce_vars: false, collapse_vars: false },
			mangle: false
		}
	],
	[
		"`===` between two calls returning different types",
		"var i = 0; function f() { return { a: i++ ? '1' : 1 }; } console.log(f().a === f().a);",
		{ compress: {}, mangle: false }
	]
];

describe("terser corrections", () => {
	it("should install", async () => {
		const { phases } = await load();
		expect(phases).toContain("correct");
	});

	it("should decline a terser it cannot read", () => {
		expect(correctFits({ ast: {} })).toBe(false);
	});

	for (const [name, input, options] of CASES) {
		it(`should print what the input prints: ${name}`, async () => {
			const { minify, corrections } = await load();
			const expected = run(input);
			const { code } = await minify(input, options);
			expect(run(/** @type {string} */ (code))).toBe(expected);

			if (!corrections) throw new Error("the correct phase is not installed");
			corrections.enabled = false;
			try {
				const uncorrected = await minify(input, options);
				const reference = await require("terser").minify(input, options);
				expect(uncorrected.code).toBe(reference.code);
				expect(run(/** @type {string} */ (reference.code))).not.toBe(expected);
			} finally {
				corrections.enabled = true;
			}
		});
	}
});
