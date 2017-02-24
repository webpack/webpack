/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const path = require("path");

const ParserHelpers = require("../ParserHelpers");

class SystemPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {

				if(typeof parserOptions.system !== "undefined" && !parserOptions.system)
					return;

				function setNotSupported(name) {
					parser.plugin("evaluate typeof " + name, ParserHelpers.evaluateToString("undefined"));
					parser.plugin("expression " + name,
						ParserHelpers.expressionIsUnsupported(name + " is not supported by webpack.")
					);
				}

				parser.plugin("typeof System.import", ParserHelpers.toConstantDependency(JSON.stringify("function")));
				parser.plugin("evaluate typeof System.import", ParserHelpers.evaluateToString("function"));

				setNotSupported("System.set");
				setNotSupported("System.get");
				setNotSupported("System.register");
				parser.plugin("expression System", function() {
					function buildExpression(context, pathToModule) {
						var moduleJsPath = path.relative(context, pathToModule);
						if(!/^[A-Z]:/i.test(moduleJsPath)) {
							moduleJsPath = "./" + moduleJsPath.replace(/\\/g, "/");
						}
						return "require(" + JSON.stringify(moduleJsPath) + ")";
					}

					return ParserHelpers.addParsedVariableToModule(this, "System", buildExpression(this.state.module.context, require.resolve("../../buildin/system.js")));
				});
			});
		});
	}
}
module.exports = SystemPlugin;
