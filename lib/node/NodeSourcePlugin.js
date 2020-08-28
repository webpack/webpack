/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const ConstDependency = require("../dependencies/ConstDependency");

/** @typedef {import("../../declarations/WebpackOptions").NodeOptions} NodeOptions */
/** @typedef {import("../Compiler")} Compiler */

module.exports = class NodeSourcePlugin {
	/**
	 * @param {NodeOptions | false} options plugin options
	 */
	constructor(options) {
		this._options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this._options;
		if (options === false) {
			// allow single kill switch to turn off this plugin
			return;
		}

		compiler.hooks.compilation.tap(
			"NodeSourcePlugin",
			(compilation, { normalModuleFactory }) => {
				const handler = (parser, parserOptions) => {
					if (parserOptions.node === false) return;

					let localOptions = options;
					if (parserOptions.node) {
						localOptions = { ...localOptions, ...parserOptions.node };
					}

					if (localOptions.global) {
						parser.hooks.expression
							.for("global")
							.tap("NodeSourcePlugin", expr => {
								const dep = new ConstDependency(
									RuntimeGlobals.global,
									expr.range,
									[RuntimeGlobals.global]
								);
								dep.loc = expr.loc;
								parser.state.module.addPresentationalDependency(dep);
							});
					}
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("NodeSourcePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("NodeSourcePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("NodeSourcePlugin", handler);
			}
		);
	}
};
