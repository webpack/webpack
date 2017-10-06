/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ParserHelpers = require("../ParserHelpers");
const parserHelpersLocation = require.resolve("../ParserHelpers");

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
					parser.plugin("evaluate typeof " + name, {
						path: parserHelpersLocation,
						fnName: "evaluateToString",
					}, { value: "undefined" });

					parser.plugin("expression " + name, {
						path: parserHelpersLocation,
						fnName: "expressionIsUnsupported",
					}, { message: name + " is not supported by webpack." });
				}

				parser.plugin("typeof System.import", {
					path: parserHelpersLocation,
					fnName: "toConstantDependency",
				}, { code: JSON.stringify("function") });

				// parser.plugin("evaluate typeof System.import", ParserHelpers.evaluateToString("function"));
				parser.plugin("evaluate typeof System.import", {
					path: parserHelpersLocation,
					fnName: "evaluateToString",
				}, { value: "function" });

				parser.plugin("typeof System", {
					path: parserHelpersLocation,
					fnName: "toConstantDependency",
				}, { code: JSON.stringify("object") });

				// parser.plugin("evaluate typeof System", ParserHelpers.evaluateToString("object"));
				parser.plugin("evaluate typeof System", {
					path: parserHelpersLocation,
					fnName: "evaluateToString",
				}, { value: "object" });

				setNotSupported("System.set");
				setNotSupported("System.get");
				setNotSupported("System.register");

				parser.plugin("expression System", {
					path: parserHelpersLocation,
					fnName: "SystemPluginExpressionSystem",
				});
			});
		});
	}
}
module.exports = SystemPlugin;
