/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const JsonParser = require("./JsonParser");
const ConcatSource = require("webpack-sources").ConcatSource;

class JsonModulesPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation, {
			normalModuleFactory
		}) => {
			normalModuleFactory.plugin("create-parser json", () => {
				return new JsonParser();
			});
			compilation.moduleTemplates.javascript.plugin("content", (moduleSource, module) => {
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
