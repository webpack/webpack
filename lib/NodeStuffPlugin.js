/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const parserHelpersLocation = require.resolve("./ParserHelpers");
const ConstDependency = require("./dependencies/ConstDependency");

const NullFactory = require("./NullFactory");

class NodeStuffPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {

				if(parserOptions.node === false)
					return;

				let localOptions = options;
				if(parserOptions.node)
					localOptions = Object.assign({}, localOptions, parserOptions.node);

				function setConstant(expressionName, value) {
					parser.plugin(`expression ${expressionName}`, {
						path: parserHelpersLocation,
						fnName: "NodeStuffAddVariable",
					}, {
						expressionName,
						value: JSON.stringify(value)
					});
				}

				function setModuleConstant(expressionName, fn) {
					parser.plugin(`expression ${expressionName}`, {
						path: parserHelpersLocation,
						fnName: "NodeStuffAddVariable"
					}, {
						expressionName,
						value: JSON.stringify(fn(this.state.module))
					});
				}
				const context = compiler.context;
				if(localOptions.__filename === "mock") {
					setConstant("__filename", "/index.js");
				} else if(localOptions.__filename) {
					setModuleConstant("__filename", module => path.relative(context, module.resource));
				}

				parser.plugin("evaluate Identifier __filename", {
					path: parserHelpersLocation,
					fnName: "NodeStuffEvaluateIdentifierFilename",
				});

				if(localOptions.__dirname === "mock") {
					setConstant("__dirname", "/");
				} else if(localOptions.__dirname) {
					setModuleConstant("__dirname", module => path.relative(context, module.context));
				}

				parser.plugin("evaluate Identifier __dirname", {
					path: parserHelpersLocation,
					fnName: "NodeStuffEvaluateIdentifierDirname",
				});

				parser.plugin("expression require.main", {
					path: parserHelpersLocation,
					fnName: "toConstantDependency",
				}, {
					code: "__webpack_require__.c[__webpack_require__.s]"
				});

				parser.plugin("expression require.extensions", {
					path: parserHelpersLocation,
					fnName: "expressionIsUnsupported",
				}, {
					message: "require.extensions is not supported by webpack. Use a loader instead."
				});

				parser.plugin("expression module.loaded", {
					path: parserHelpersLocation,
					fnName: "toConstantDependency",
				}, {
					code: "module.l"
				});

				parser.plugin("expression module.id", {
					path: parserHelpersLocation,
					fnName: "toConstantDependency",
				}, {
					code: "module.i"
				});

				parser.plugin("expression module.exports", {
					path: parserHelpersLocation,
					fnName: "NodeStuffModuleExports",
				});

				parser.plugin("evaluate Identifier module.hot", {
					path: parserHelpersLocation,
					fnName: "evaluateToIdentifier",
				}, {
					identifier: "module.hot",
					truthy: false
				});

				parser.plugin("expression module", {
					path: parserHelpersLocation,
					fnName: "NodeStuffExpressionModule",
				});
			});
		});
	}
}
module.exports = NodeStuffPlugin;
