/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { getModulePath } = require("../JavascriptParserHelpers");
const ProvidedDependency = require("../dependencies/ProvidedDependency");

/** @typedef {import("../../declarations/WebpackOptions").NodeOptions} NodeOptions */
/** @typedef {import("../Compiler")} Compiler */

module.exports = class NodeSourcePlugin {
	/**
	 * @param {NodeOptions | false} options plugin options
	 */
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		if (options === false) {
			// allow single kill switch to turn off this plugin
			return;
		}

		compiler.hooks.compilation.tap(
			"NodeSourcePlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ProvidedDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ProvidedDependency,
					new ProvidedDependency.Template()
				);

				const handler = (parser, parserOptions) => {
					if (parserOptions.node === false) return;

					let localOptions = options;
					if (parserOptions.node) {
						localOptions = Object.assign({}, localOptions, parserOptions.node);
					}
					if (localOptions.global) {
						parser.hooks.expression
							.for("global")
							.tap("NodeSourcePlugin", expr => {
								const dep = new ProvidedDependency(
									getModulePath(
										parser.state.module.context,
										require.resolve("../../buildin/global")
									),
									"global",
									null,
									expr.range
								);
								dep.loc = expr.loc;
								parser.state.module.addDependency(dep);
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
