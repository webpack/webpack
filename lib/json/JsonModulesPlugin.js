/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const JsonGenerator = require("./JsonGenerator");
const JsonParser = require("./JsonParser");

/** @typedef {import("../Compiler")} Compiler */

let parserSchema;

class JsonModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"JsonModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.createParser
					.for("json")
					.tap("JsonModulesPlugin", parserOptions => {
						if (parserSchema === undefined) {
							parserSchema = require("../../schemas/plugins/JsonModulesPluginParser.json");
						}
						validateOptions(parserSchema, parserOptions, {
							name: "Json Modules Plugin",
							baseDataPath: "parser"
						});

						return new JsonParser(parserOptions);
					});
				normalModuleFactory.hooks.createGenerator
					.for("json")
					.tap("JsonModulesPlugin", () => {
						return new JsonGenerator();
					});
			}
		);
	}
}

module.exports = JsonModulesPlugin;
