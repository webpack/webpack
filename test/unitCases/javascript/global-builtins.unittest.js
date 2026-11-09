"use strict";

const vm = require("vm");
const { javascript } = require("webpack");
const cases = require("../../fixtures/minify-global-builtins.json");
const optional = require("../../fixtures/minify-optional-global-builtins.json");

/**
 * @param {string} source a program
 * @returns {string} what the program prints in its own realm
 */
const runProgram = (source) => {
	/** @type {string[]} */
	const lines = [];
	const context = vm.createContext({
		console: {
			log: (/** @type {unknown[]} */ ...values) =>
				lines.push(values.map(String).join(" "))
		}
	});
	// Model the global-object names of the supported hosts, including Node 10.
	vm.runInContext("this.globalThis = this.window = this.self = this.global = this;", context);
	vm.runInContext(source, context);
	return lines.join("\n");
};

describe("minifying built-in mutations through the global object", () => {
	for (const ecma of [5, 2020]) {
		for (const mangle of [false, true]) {
			it.each(cases)("$name (ecma " + ecma + ", mangle " + mangle + ")", ({ source, expected }) => {
				expect(runProgram(source)).toBe(expected);
				const { code } = /** @type {{ code: string }} */ (
					new javascript.syntax.SourceProcessor().process(source, {
						mode: "minify",
						ecma,
						compress: {},
						mangle
					})
				);
				expect(runProgram(code)).toBe(expected);
				expect(code).toMatchSnapshot();
			});
		}
	}

	it.each(optional)("should preserve an optional global owner: %s", (source) => {
		const { code } = /** @type {{ code: string }} */ (
			new javascript.syntax.SourceProcessor().process(source, {
				mode: "minify",
				compress: {},
				mangle: false
			})
		);
		expect(code).toMatchSnapshot();
		expect(code).toContain("Math.abs(");
	});
});
