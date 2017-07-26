/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ImportEagerContextDependency = require("./ImportEagerContextDependency");
const ImportWeakDependency = require("./ImportWeakDependency");
const ImportWeakContextDependency = require("./ImportWeakContextDependency");
const ImportLazyOnceContextDependency = require("./ImportLazyOnceContextDependency");
const ImportLazyContextDependency = require("./ImportLazyContextDependency");
const ImportDependenciesBlock = require("./ImportDependenciesBlock");
const ImportEagerDependency = require("./ImportEagerDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");

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
			let mode = "lazy";

			const importOptions = parser.getCommentOptions(expr.range);
			if(importOptions) {
				if(typeof importOptions.webpackChunkName !== "undefined") {
					if(typeof importOptions.webpackChunkName !== "string")
						parser.state.module.warnings.push(new UnsupportedFeatureWarning(parser.state.module, `\`webpackChunkName\` expected a string, but received: ${importOptions.webpackChunkName}.`));
					else
						chunkName = importOptions.webpackChunkName;
				}
				if(typeof importOptions.webpackMode !== "undefined") {
					if(typeof importOptions.webpackMode !== "string")
						parser.state.module.warnings.push(new UnsupportedFeatureWarning(parser.state.module, `\`webpackMode\` expected a string, but received: ${importOptions.webpackMode}.`));
					else
						mode = importOptions.webpackMode;
				}
			}

			if(param.isString()) {
				if(mode !== "lazy" && mode !== "eager" && mode !== "weak") {
					parser.state.module.warnings.push(new UnsupportedFeatureWarning(parser.state.module, `\`webpackMode\` expected 'lazy', 'eager' or 'weak', but received: ${mode}.`));
				}

				if(mode === "eager") {
					const dep = new ImportEagerDependency(param.string, expr.range);
					parser.state.current.addDependency(dep);
				} else if(mode === "weak") {
					const dep = new ImportWeakDependency(param.string, expr.range);
					parser.state.current.addDependency(dep);
				} else {
					const depBlock = new ImportDependenciesBlock(param.string, expr.range, chunkName, parser.state.module, expr.loc);
					parser.state.current.addBlock(depBlock);
				}
				return true;
			} else {
				if(mode !== "lazy" && mode !== "lazy-once" && mode !== "eager" && mode !== "weak") {
					parser.state.module.warnings.push(new UnsupportedFeatureWarning(parser.state.module, `\`webpackMode\` expected 'lazy', 'lazy-once', 'eager' or 'weak', but received: ${mode}.`));
				}

				let Dep = ImportLazyContextDependency;
				if(mode === "eager") {
					Dep = ImportEagerContextDependency;
				} else if(mode === "weak") {
					Dep = ImportWeakContextDependency;
				} else if(mode === "lazy-once") {
					Dep = ImportLazyOnceContextDependency;
				}
				const dep = ContextDependencyHelpers.create(Dep, expr.range, param, expr, options, chunkName);
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
