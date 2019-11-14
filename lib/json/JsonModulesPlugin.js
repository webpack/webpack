/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const JsonGenerator = require("./JsonGenerator");
const JsonParser = require("./JsonParser");

/** @typedef {import("../Compiler")} Compiler */

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
					.tap("JsonModulesPlugin", () => {
						return new JsonParser();
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
