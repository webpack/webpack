/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const JavascriptModulesPlugin = require("./JavascriptModulesPlugin");
const JsonGenerator = require("./JsonGenerator");
const JsonParser = require("./JsonParser");

class JsonModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"JsonModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				const hooks = JavascriptModulesPlugin.getHooks(compilation);
				hooks.shouldRender.tap("JavascriptModulesPlugin", module => {
					if (module.type === "json") return true;
				});
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
