"use strict";

/** @import { Compiler, Configuration } from "../../../../../" */

/** @typedef {Compiler["options"]["optimization"]} Optimization */

/** @type {{ minimize?: Optimization["minimize"], minimizeOptions?: Optimization["minimizeOptions"] }} */
const observed = {};

// The JavaScript minimizer's options carry the compressor's own types:
// `unused` is a switch, so a string is refused.
/** @type {Optimization["minimizeOptions"]} */
const mistyped = {
	// @ts-expect-error `unused` is a boolean
	javascript: { compress: { unused: "yes" } }
};

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		// The object form is a shorthand for `true` plus `minimizeOptions`, so a
		// minimizer plugin still reads a boolean off the resolved config.
		minimize: {
			javascript: { compress: { passes: 1 } }
		},
		minimizer: [
			{
				/**
				 * @param {Compiler} compiler compiler
				 * @returns {void}
				 */
				apply(compiler) {
					observed.minimize = compiler.options.optimization.minimize;
					observed.minimizeOptions =
						compiler.options.optimization.minimizeOptions;
				}
			},
			"..."
		]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("ObserveMinimizePlugin", () => {
				expect(mistyped).toBeDefined();
				expect(observed.minimize).toBe(true);
				expect(observed.minimizeOptions).toEqual({
					css: {},
					html: {},
					javascript: { compress: { passes: 1 } },
					json: false
				});
			});
		}
	]
};
