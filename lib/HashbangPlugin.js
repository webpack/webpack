/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author @wh0
*/

"use strict";

const ConstDependency = require("./dependencies/ConstDependency");

/** @typedef {import("./Compiler")} Compiler */

class HashbangPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"HashbangPlugin",
			(compilation, { normalModuleFactory }) => {
				const handler = parser => {
					parser.hooks.program.tap("HashbangPlugin", (ast, comments) => {
						const firstComment = comments[0];
						if (
							firstComment &&
							parser.state.module
								.originalSource()
								.source()
								.slice(
									firstComment.start,
									Math.min(firstComment.start + 2, firstComment.end)
								) === "#!"
						) {
							// We usually render into a template that wraps the source in
							// something, where a hashbang won't be valid. Remove them from
							// sources. Use BannerPlugin to add a new on to the result.
							const dep = new ConstDependency("", firstComment.range);
							dep.loc = firstComment.loc;
							parser.state.module.addPresentationalDependency(dep);
						}
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("UseStrictPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("UseStrictPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("UseStrictPlugin", handler);
			}
		);
	}
}

module.exports = HashbangPlugin;
