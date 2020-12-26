/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { validate } = require("schema-utils");
const memoize = require("../util/memoize");
const JsonGenerator = require("./JsonGenerator");
const JsonParser = require("./JsonParser");

/** @typedef {import("../Compiler")} Compiler */

const getParserSchema = memoize(() =>
	require("../../schemas/plugins/JsonModulesPluginParser.json")
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
						validate(getParserSchema(), parserOptions, {
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
