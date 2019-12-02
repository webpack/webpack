/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const JsonGenerator = require("./JsonGenerator");
const JsonParser = require("./JsonParser");

/** @typedef {import("../Compiler")} Compiler */

const lazyRequire = require("../util/lazyRequire")(require);
const parserSchema = lazyRequire(
	"../../schemas/plugins/JsonModulesPluginParser.json",
	false
);

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
