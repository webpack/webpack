/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
const NormalModule = require("./NormalModule");

const validateOptions = require("schema-utils");
const schema = require("../schemas/plugins/LoaderOptionsPlugin.json");

/** @typedef {import("../declarations/plugins/LoaderOptionsPlugin").LoaderOptionsPluginOptions} LoaderOptionsPluginOptions */
/** @typedef {import("./Compiler")} Compiler */

class LoaderOptionsPlugin {
	/**
	 * @param {LoaderOptionsPluginOptions} options options object
	 */
	constructor(options = {}) {
		validateOptions(schema, options, {
			name: "Loader Options Plugin",
			baseDataPath: "options"
		});
		if (typeof options !== "object") options = {};
		if (!options.test) {
			options.test = {
				test: () => true
			};
		}
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap("LoaderOptionsPlugin", compilation => {
			NormalModule.getCompilationHooks(compilation).loader.tap(
				"LoaderOptionsPlugin",
				(context, module) => {
					const resource = module.resource;
					if (!resource) return;
					const i = resource.indexOf("?");
					if (
						ModuleFilenameHelpers.matchObject(
							options,
							i < 0 ? resource : resource.substr(0, i)
						)
					) {
						for (const key of Object.keys(options)) {
							if (key === "include" || key === "exclude" || key === "test") {
								continue;
							}
							context[key] = options[key];
						}
					}
				}
			);
		});
	}
}

module.exports = LoaderOptionsPlugin;
