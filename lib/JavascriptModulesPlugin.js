/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Parser = require("./Parser");

class JavascriptModulesPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation, {
			normalModuleFactory
		}) => {
			normalModuleFactory.plugin(["create-parser javascript/auto", "create-parser javascript/dynamic", "create-parser javascript/esm"], () => {
				return new Parser();
			});
		});
	}
}

module.exports = JavascriptModulesPlugin;
