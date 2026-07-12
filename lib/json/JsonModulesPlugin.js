/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import { JSON_MODULE_TYPE } from "../ModuleTypeConstants.js";
import JsonGenerator from "./JsonGenerator.js";
import JsonModule from "./JsonModule.js";
import JsonParser from "./JsonParser.js";

const require = createRequire(import.meta.url);
/** @typedef {import("../Compiler.js").default} Compiler */

const PLUGIN_NAME = "JsonModulesPlugin";

/**
 * The JsonModulesPlugin is the entrypoint plugin for the json modules feature.
 * It adds the json module type to the compiler and registers the json parser and generator.
 */
class JsonModulesPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.createModuleClass
					.for(JSON_MODULE_TYPE)
					.tap(
						PLUGIN_NAME,
						(createData, _resolveData) => new JsonModule(createData)
					);
				normalModuleFactory.hooks.createParser
					.for(JSON_MODULE_TYPE)
					.tap(PLUGIN_NAME, (parserOptions) => {
						compiler.validate(
							() =>
								require("../../schemas/plugins/json/JsonModulesPluginParser.json"),
							parserOptions,
							{
								name: "Json Modules Plugin",
								baseDataPath: "parser"
							},
							(options) =>
								/** @type {typeof import("../../schemas/plugins/json/JsonModulesPluginParser.check.js")} */ (
									require("../../schemas/plugins/json/JsonModulesPluginParser.check.js")
								)(options)
						);

						return new JsonParser(parserOptions);
					});
				normalModuleFactory.hooks.createGenerator
					.for(JSON_MODULE_TYPE)
					.tap(PLUGIN_NAME, (generatorOptions) => {
						compiler.validate(
							() =>
								require("../../schemas/plugins/json/JsonModulesPluginGenerator.json"),
							generatorOptions,
							{
								name: "Json Modules Plugin",
								baseDataPath: "generator"
							},
							(options) =>
								/** @type {typeof import("../../schemas/plugins/json/JsonModulesPluginGenerator.check.js")} */ (
									require("../../schemas/plugins/json/JsonModulesPluginGenerator.check.js")
								)(options)
						);

						return new JsonGenerator(generatorOptions);
					});
			}
		);
	}
}

export default JsonModulesPlugin;

export { JsonModulesPlugin as "module.exports" };
