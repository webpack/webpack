/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ImportContextDependency = require("./ImportContextDependency");
const ImportDependenciesBlock = require("./ImportDependenciesBlock");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");

class ImportParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;

		parser.plugin(["call System.import", "import-call"], (expr) => {
			if(expr.arguments.length !== 1)
				throw new Error("Incorrect number of arguments provided to 'import(module: string) -> Promise'.");

			const param = parser.evaluateExpression(expr.arguments[0]);

			let chunkName = null;

			const importOptions = parser.getCommentOptions(expr.range);
			if(importOptions) {
				if(typeof importOptions.webpackChunkName !== "undefined") {
					if(typeof importOptions.webpackChunkName !== "string")
						throw new Error(`\`webpackChunkName\` expected a string, but received: ${importOptions.webpackChunkName}.`);
					chunkName = importOptions.webpackChunkName;
				}
			}

			if(param.isString()) {
				const depBlock = new ImportDependenciesBlock(param.string, expr.range, chunkName, parser.state.module, expr.loc);
				parser.state.current.addBlock(depBlock);
				return true;
			} else {
				const dep = ContextDependencyHelpers.create(ImportContextDependency, expr.range, param, expr, options, chunkName);
				if(!dep) return;
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		});
	}
}
module.exports = ImportParserPlugin;
