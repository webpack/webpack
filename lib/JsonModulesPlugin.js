/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const JsonParser = require("./JsonParser");
const ConcatSource = require("webpack-sources").ConcatSource;

class JsonModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("JsonModulesPlugin", (compilation, {
			normalModuleFactory
		}) => {
			normalModuleFactory.hooks.createParser.for("json").tap("JsonModulesPlugin", () => {
				return new JsonParser();
			});
			compilation.moduleTemplates.javascript.hooks.content.tap("JsonModulesPlugin", (moduleSource, module) => {
				if(module.type && module.type.startsWith("json")) {
					const source = new ConcatSource();
					source.add(`${module.moduleArgument}.exports = `);
					source.add(moduleSource);
					return source;
				} else {
					return moduleSource;
				}
			});
		});
	}
}

module.exports = JsonModulesPlugin;
