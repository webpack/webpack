/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ParserHelpers = require("../ParserHelpers");

class SystemPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("SystemPlugin", (compilation, {
			normalModuleFactory
		}) => {
			const handler = (parser, parserOptions) => {
				if(typeof parserOptions.system !== "undefined" && !parserOptions.system)
					return;

				const setNotSupported = name => {
					parser.plugin("evaluate typeof " + name, ParserHelpers.evaluateToString("undefined"));
					parser.plugin("expression " + name,
						ParserHelpers.expressionIsUnsupported(name + " is not supported by webpack.")
					);
				};

				parser.plugin("typeof System.import", ParserHelpers.toConstantDependency(JSON.stringify("function")));
				parser.plugin("evaluate typeof System.import", ParserHelpers.evaluateToString("function"));
				parser.plugin("typeof System", ParserHelpers.toConstantDependency(JSON.stringify("object")));
				parser.plugin("evaluate typeof System", ParserHelpers.evaluateToString("object"));

				setNotSupported("System.set");
				setNotSupported("System.get");
				setNotSupported("System.register");
				parser.plugin("expression System", () => {
					const systemPolyfillRequire = ParserHelpers.requireFileAsExpression(
						parser.state.module.context, require.resolve("../../buildin/system.js"));
					return ParserHelpers.addParsedVariableToModule(parser, "System", systemPolyfillRequire);
				});
			};

			normalModuleFactory.hooks.parser.for("javascript/auto").tap("SystemPlugin", handler);
			normalModuleFactory.hooks.parser.for("javascript/dynamic").tap("SystemPlugin", handler);
		});
	}
}
module.exports = SystemPlugin;
