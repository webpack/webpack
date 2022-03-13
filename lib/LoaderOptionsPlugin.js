/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
const NormalModule = require("./NormalModule");
const createSchemaValidation = require("./util/create-schema-validation");

/** @typedef {import("../declarations/plugins/LoaderOptionsPlugin").LoaderOptionsPluginOptions} LoaderOptionsPluginOptions */
/** @typedef {import("./Compiler")} Compiler */

const validate = createSchemaValidation(
	require("../schemas/plugins/LoaderOptionsPlugin.check.js"),
	() => require("../schemas/plugins/LoaderOptionsPlugin.json"),
	{
		name: "Loader Options Plugin",
		baseDataPath: "options"
	}
);
class LoaderOptionsPlugin {
	/**
	 * @param {LoaderOptionsPluginOptions} options options object
	 */
	constructor(options = {}) {
		validate(options);
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
							i < 0 ? resource : resource.slice(0, i)
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
