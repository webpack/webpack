/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const commentParser = require("../util/commentParser");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const ImportContextDependency = require("./ImportContextDependency");
const ImportDependency = require("./ImportDependency");
const ImportEagerDependency = require("./ImportEagerDependency");
const ImportWeakDependency = require("./ImportWeakDependency");

class ImportParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		parser.hooks.importCall.tap("ImportParserPlugin", expr => {
			const param = parser.evaluateExpression(expr.source);

			const parsed = commentParser(parser, expr, "lazy", true);

			if (!parsed) {
				return false;
			}
			let mode = parsed.mode;
			const { chunkName, exports, include, exclude, groupOptions } = parsed;

			if (param.isString()) {
				if (mode !== "lazy" && mode !== "eager" && mode !== "weak") {
					parser.state.module.addWarning(
						new UnsupportedFeatureWarning(
							`\`webpackMode\` expected 'lazy', 'eager' or 'weak', but received: ${mode}.`,
							expr.loc
						)
					);
				}

				if (mode === "eager") {
					const dep = new ImportEagerDependency(
						param.string,
						expr.range,
						exports
					);
					parser.state.current.addDependency(dep);
				} else if (mode === "weak") {
					const dep = new ImportWeakDependency(
						param.string,
						expr.range,
						exports
					);
					parser.state.current.addDependency(dep);
				} else {
					const depBlock = new AsyncDependenciesBlock(
						{
							...groupOptions,
							name: chunkName
						},
						expr.loc,
						param.string
					);
					const dep = new ImportDependency(param.string, expr.range, exports);
					dep.loc = expr.loc;
					depBlock.addDependency(dep);
					parser.state.current.addBlock(depBlock);
				}
				return true;
			} else {
				if (
					mode !== "lazy" &&
					mode !== "lazy-once" &&
					mode !== "eager" &&
					mode !== "weak"
				) {
					parser.state.module.addWarning(
						new UnsupportedFeatureWarning(
							`\`webpackMode\` expected 'lazy', 'lazy-once', 'eager' or 'weak', but received: ${mode}.`,
							expr.loc
						)
					);
					mode = "lazy";
				}

				if (mode === "weak") {
					mode = "async-weak";
				}
				const dep = ContextDependencyHelpers.create(
					ImportContextDependency,
					expr.range,
					param,
					expr,
					this.options,
					{
						chunkName,
						groupOptions,
						include,
						exclude,
						mode,
						namespaceObject: parser.state.module.buildMeta.strictHarmonyModule
							? "strict"
							: true,
						typePrefix: "import()",
						category: "esm",
						referencedExports: exports
					},
					parser
				);
				if (!dep) return;
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		});
	}
}

module.exports = ImportParserPlugin;
