"use strict";

const path = require("path");
const { NormalModule } = require("../../../../");

/** @import { Compiler, Configuration } from "../../../../" */

const PLUGIN = "MutateResourcePlugin";

class MutateResourcePlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN, (compilation) => {
			NormalModule.getCompilationHooks(compilation).beforeLoaders.tap(
				PLUGIN,
				(loaders, normalModule) => {
					// mutate the resource after the context was created; the runner must
					// derive resource fields from this (late) value, not an early snapshot
					if (normalModule.resource.endsWith("a.js")) {
						normalModule.resource += "?injected";
					}
				}
			);
		});
	}
}

/** @type {Configuration} */
module.exports = {
	plugins: [new MutateResourcePlugin()],
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
