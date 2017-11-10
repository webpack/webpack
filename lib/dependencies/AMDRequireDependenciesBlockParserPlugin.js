/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const getFunctionExpression = require("./getFunctionExpression");

const parserHelpersLocation = require.resolve("../ParserHelpers");

class AMDRequireDependenciesBlockParserPlugin {
	constructor(options) {
		this.options = options;
	}

	processFunctionArgument(parser, expression) {
		let bindThis = true;
		const fnData = getFunctionExpression(expression);
		if(fnData) {
			parser.inScope(fnData.fn.params.filter((i) => {
				return ["require", "module", "exports"].indexOf(i.name) < 0;
			}), () => {
				if(fnData.fn.body.type === "BlockStatement")
					parser.walkStatement(fnData.fn.body);
				else
					parser.walkExpression(fnData.fn.body);
			});
			parser.walkExpressions(fnData.expressions);
			if(fnData.needThis === false) {
				bindThis = false;
			}
		} else {
			parser.walkExpression(expression);
		}
		return bindThis;
	}

	apply(parser) {
		const options = this.options;

		parser.plugin("call require", {
			path: parserHelpersLocation,
			fnName: "AMDRequireDependenciesBlockCallRequire",
		});

		parser.plugin("call require:amd:array", {
			path: parserHelpersLocation,
			fnName: "AMDRequireDependenciesCallRequireAMDArray",
		});

		parser.plugin("call require:amd:item", {
			path: parserHelpersLocation,
			fnName: "AMDRequireDependenciesCallRequireAMDItem",
		});

		parser.plugin("call require:amd:context", {
			path: parserHelpersLocation,
			fnName: "AMDRequireDependenciesCallRequireAMDContext",
		}, options);
	}
}
module.exports = AMDRequireDependenciesBlockParserPlugin;
