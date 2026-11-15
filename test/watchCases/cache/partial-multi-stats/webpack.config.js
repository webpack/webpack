"use strict";

/** @returns {import("../../../..").Configuration[]} watch configurations */
module.exports = () =>
	[0, 1].map((index) => ({
		entry: index === 0 ? "./first" : "./second",
		output: { clean: false, filename: `bundle${index}.js` },
		plugins: [
			{
				compiler: /** @type {import("../../../..").Compiler | undefined} */ (
					undefined
				),
				/**
				 * @this {{ compiler: import("../../../..").Compiler | undefined }}
				 * @param {import("../../../..").Compiler} compiler watched compiler
				 * @returns {void}
				 */
				apply(compiler) {
					this.compiler = compiler;
				}
			}
		]
	}));
