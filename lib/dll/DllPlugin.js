/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const FlagAllModulesAsUsedPlugin = require("../optimize/FlagAllModulesAsUsedPlugin");
const DllEntryPlugin = require("./DllEntryPlugin");
const LibManifestPlugin = require("./LibManifestPlugin");

/** @import Compiler from "../Compiler" */
/** @import { Entries, Options } from "./DllEntryPlugin" */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
 */

/**
 * @schema plugins/dll/DllPlugin
 * @typedef {object} DllPluginOptions
 * @property {NonEmptyString=} context Context of requests in the manifest file (defaults to the webpack context).
 * @property {boolean=} entryOnly If true, only entry points will be exposed (default: true).
 * @property {boolean=} format If true, manifest json file (output) will be formatted.
 * @property {NonEmptyString=} name Name of the exposed dll function (external name, use value of 'output.library').
 * @property {NonEmptyString} path Absolute path to the manifest json file (output).
 * @property {NonEmptyString=} type Type of the dll bundle (external type, use value of 'output.libraryTarget').
 */

const PLUGIN_NAME = "DllPlugin";

class DllPlugin {
	/**
	 * Creates an instance of DllPlugin.
	 * @param {DllPluginOptions} options options object
	 */
	constructor(options) {
		/** @type {DllPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => require("../../schemas/plugins/dll/DllPlugin.json"),
				this.options,
				{
					name: "Dll Plugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../../schemas/plugins/dll/DllPlugin.check")(options)
			);
		});

		const entryOnly = this.options.entryOnly !== false;
		compiler.hooks.entryOption.tap(PLUGIN_NAME, (context, entry) => {
			if (typeof entry !== "function") {
				for (const name of Object.keys(entry)) {
					/** @type {Options} */
					const options = { name };
					new DllEntryPlugin(
						context,
						/** @type {Entries} */
						(entry[name].import),
						options
					).apply(compiler);
				}
			} else {
				throw new Error(
					`${PLUGIN_NAME} doesn't support dynamic entry (function) yet`
				);
			}
			return true;
		});
		new LibManifestPlugin({ ...this.options, entryOnly }).apply(compiler);
		if (!entryOnly) {
			new FlagAllModulesAsUsedPlugin(PLUGIN_NAME).apply(compiler);
			compiler.hooks.compilation.tap(
				PLUGIN_NAME,
				(_compilation, { normalModuleFactory }) => {
					normalModuleFactory.hooks.module.tap(
						{ name: PLUGIN_NAME, stage: 10 },
						(module) => {
							if (module.factoryMeta === undefined) {
								module.factoryMeta = {};
							}
							module.factoryMeta.sideEffectFree = false;
							return module;
						}
					);
				}
			);
		}
	}
}

module.exports = DllPlugin;
