"use strict";

/** @import { Configuration, Compiler } from "../../../.." */

/** @returns {Configuration[]} watch configurations */
module.exports = () =>
	[0, 1].map((index) => ({
		entry: index === 0 ? "./first" : "./second",
		output: { clean: false, filename: `bundle${index}.js` },
		plugins: [
			{
				compiler: /** @type {Compiler | undefined} */ (undefined),
				/**
				 * @this {{ compiler: Compiler | undefined }}
				 * @param {Compiler} compiler watched compiler
				 * @returns {void}
				 */
				apply(compiler) {
					this.compiler = compiler;
				}
			}
		]
	}));
