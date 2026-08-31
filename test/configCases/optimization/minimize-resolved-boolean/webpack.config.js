"use strict";

/** @typedef {import("../../../../").Compiler["options"]["optimization"]} Optimization */

/** @type {{ minimize?: Optimization["minimize"], minimizeOptions?: Optimization["minimizeOptions"] }} */
const observed = {};

/** @type {import("../../../../").Configuration} */
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
				 * @param {import("../../../../").Compiler} compiler compiler
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
				expect(observed.minimize).toBe(true);
				expect(observed.minimizeOptions).toEqual({
					css: {},
					html: {},
					javascript: { compress: { passes: 1 } }
				});
			});
		}
	]
};
