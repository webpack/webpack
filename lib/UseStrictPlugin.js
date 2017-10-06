/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

// const ConstDependency = require("./dependencies/ConstDependency");
const parserHelpersLocation = require.resolve("./ParserHelpers");

class UseStrictPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			params.normalModuleFactory.plugin("parser", (parser) => {
				parser.plugin("program", {
					path: parserHelpersLocation,
					fnName: "UseStrictProgram",
				});
			});
		});
	}
}

module.exports = UseStrictPlugin;
