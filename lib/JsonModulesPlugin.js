/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const JsonParser = require("./JsonParser");
const ConcatSource = require("webpack-sources").ConcatSource;

const stringifySafe = data => JSON.stringify(data)
	.replace(/\u2028|\u2029/g, str => str === "\u2029" ? "\\u2029" : "\\u2028"); // invalid in JavaScript but valid JSON

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
					const data = module.buildInfo.jsonData;
					if(Array.isArray(module.buildMeta.providedExports) && !module.isUsed("default")) {
						// Only some exports are used: We can optimize here, by only generating a part of the JSON
						const reducedJson = {};
						for(const exportName of module.buildMeta.providedExports) {
							if(exportName === "default")
								continue;
							const used = module.isUsed(exportName);
							if(used) {
								reducedJson[used] = data[exportName];
							}
						}
						source.add(`${module.moduleArgument}.exports = ${stringifySafe(reducedJson)};`);
					} else {
						source.add(`${module.moduleArgument}.exports = ${stringifySafe(data)};`);
					}
					return source;
				} else {
					return moduleSource;
				}
			});
		});
	}
}

module.exports = JsonModulesPlugin;
