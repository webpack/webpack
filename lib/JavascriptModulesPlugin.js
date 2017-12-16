/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Parser = require("./Parser");

class JavascriptModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("JavascriptModulesPlugin", (compilation, {
			normalModuleFactory
		}) => {
			const createParser = () => {
				return new Parser();
			};

			normalModuleFactory.hooks.createParser.for("javascript/auto").tap("JavascriptModulesPlugin", createParser);
			normalModuleFactory.hooks.createParser.for("javascript/dynamic").tap("JavascriptModulesPlugin", createParser);
			normalModuleFactory.hooks.createParser.for("javascript/esm").tap("JavascriptModulesPlugin", createParser);
		});
	}
}

module.exports = JavascriptModulesPlugin;
