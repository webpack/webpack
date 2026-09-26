"use strict";

// terser is a development dependency only, there to compare against. What a
// build minifies with is the copy webpack carries, so a build must not reach
// for the published package at all — which this holds by taking it away.
jest.mock("terser", () => {
	throw new Error("terser is not installed");
});

const jsMinify = require("../../lib/javascript/jsMinify");

const SOURCE = "function add(first, second) { return first + second; }\nsink(add);";

describe("jsMinify without terser installed", () => {
	it("should have no terser to reach", () => {
		expect(() => require("terser")).toThrow("terser is not installed");
	});

	it.each([
		["as released", false],
		["through webpack's printer", true]
	])("should minify with the terser webpack carries: %s", async (_name, printer) => {
		const result = await jsMinify({ "a.js": SOURCE }, undefined, { printer });
		expect(result.errors).toBeUndefined();
		expect(result.code).toBe("function add(d,n){return d+n}sink(add);");
	});

	// `make_string` escapes every backslash before a quote helper runs, so each
	// helper escapes only its own quote — which a scanner reading one helper
	// alone reports as incomplete. What it prints must read back as what it was.
	it.each([
		["a backslash", "sink('a\\\\b');"],
		["a backslash before each quote", "sink('\\\\\\'\\\\\"\\\\`');"],
		["only backslashes", "sink('\\\\\\\\');"],
		["a template's escaped substitution", "sink(`\\${a}`);"],
		["a template's backslash before a substitution", "sink(`\\\\${1}`);"],
		["a template's escaped backtick", "sink(`\\``);"],
		["a line separator after a backslash", "sink('\\u2028\\\\');"]
	])("should print %s back as itself", async (_name, source) => {
		// A registry of its own: the printer above installed webpack's phases into
		// the copy this file already read, and those print strings their own way.
		/** @type {{ minify?: typeof import("../../lib/javascript/terser").minify }} */
		const released = {};
		jest.isolateModules(() => {
			released.minify = require("../../lib/javascript/terser").minify;
		});
		const minify = /** @type {NonNullable<typeof released.minify>} */ (
			released.minify
		);
		/**
		 * @param {string} code a script calling `sink` once
		 * @returns {unknown} what it called it with
		 */
		const read = (code) => {
			/** @type {unknown} */
			let value;
			// eslint-disable-next-line no-new-func
			new Function("sink", code)((/** @type {unknown} */ v) => (value = v));
			return value;
		};
		const expected = read(source);
		for (const quote_style of /** @type {(0 | 1 | 2 | 3)[]} */ ([0, 1, 2, 3])) {
			for (const compress of [false, {}]) {
				const { code } = await minify(source, {
					compress,
					mangle: false,
					format: { quote_style }
				});
				expect(read(/** @type {string} */ (code))).toBe(expected);
			}
		}
	});
});
