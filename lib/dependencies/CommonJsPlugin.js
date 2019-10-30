/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
const CommonJsRequireDependency = require("./CommonJsRequireDependency");
const ConstDependency = require("./ConstDependency");
const RequireHeaderDependency = require("./RequireHeaderDependency");
const RequireResolveContextDependency = require("./RequireResolveContextDependency");
const RequireResolveDependency = require("./RequireResolveDependency");
const RequireResolveHeaderDependency = require("./RequireResolveHeaderDependency");

const CommonJsRequireDependencyParserPlugin = require("./CommonJsRequireDependencyParserPlugin");
const RequireResolveDependencyParserPlugin = require("./RequireResolveDependencyParserPlugin");

const RuntimeGlobals = require("../RuntimeGlobals");

const {
	evaluateToIdentifier,
	evaluateToString,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");

class CommonJsPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap(
			"CommonJsPlugin",
			(compilation, { contextModuleFactory, normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					CommonJsRequireDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CommonJsRequireDependency,
					new CommonJsRequireDependency.Template()
				);

				compilation.dependencyFactories.set(
					CommonJsRequireContextDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					CommonJsRequireContextDependency,
					new CommonJsRequireContextDependency.Template()
				);

				compilation.dependencyFactories.set(
					RequireResolveDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					RequireResolveDependency,
					new RequireResolveDependency.Template()
				);

				compilation.dependencyFactories.set(
					RequireResolveContextDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					RequireResolveContextDependency,
					new RequireResolveContextDependency.Template()
				);

				compilation.dependencyTemplates.set(
					RequireResolveHeaderDependency,
					new RequireResolveHeaderDependency.Template()
				);

				compilation.dependencyTemplates.set(
					RequireHeaderDependency,
					new RequireHeaderDependency.Template()
				);

				const handler = (parser, parserOptions) => {
					if (parserOptions.commonjs !== undefined && !parserOptions.commonjs)
						return;

					const tapRequireExpression = (expression, getMembers) => {
						parser.hooks.typeof
							.for(expression)
							.tap(
								"CommonJsPlugin",
								toConstantDependency(parser, JSON.stringify("function"))
							);
						parser.hooks.evaluateTypeof
							.for(expression)
							.tap("CommonJsPlugin", evaluateToString("function"));
						parser.hooks.evaluateIdentifier
							.for(expression)
							.tap(
								"CommonJsPlugin",
								evaluateToIdentifier(expression, "require", getMembers, true)
							);
					};
					tapRequireExpression("require", () => []);
					tapRequireExpression("require.resolve", () => ["resolve"]);
					tapRequireExpression("require.resolveWeak", () => ["resolveWeak"]);

					parser.hooks.evaluateTypeof
						.for("module")
						.tap("CommonJsPlugin", evaluateToString("object"));
					parser.hooks.expression.for("exports").tap("CommonJsPlugin", expr => {
						const module = parser.state.module;
						const isHarmony = module.buildMeta && module.buildMeta.exportsType;
						if (!isHarmony) {
							return toConstantDependency(parser, module.exportsArgument, [
								RuntimeGlobals.exports
							])(expr);
						}
					});
					parser.hooks.assign.for("require").tap("CommonJsPlugin", expr => {
						// to not leak to global "require", we need to define a local require here.
						const dep = new ConstDependency("var require;", 0);
						dep.loc = expr.loc;
						parser.state.module.addPresentationalDependency(dep);
						return true;
					});
					parser.hooks.canRename
						.for("require")
						.tap("CommonJsPlugin", () => true);
					parser.hooks.rename.for("require").tap("CommonJsPlugin", expr => {
						// To avoid "not defined" error, replace the value with undefined
						const dep = new ConstDependency("undefined", expr.range);
						dep.loc = expr.loc;
						parser.state.module.addPresentationalDependency(dep);
						return false;
					});
					parser.hooks.typeof
						.for("module")
						.tap(
							"CommonJsPlugin",
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.evaluateTypeof
						.for("exports")
						.tap("CommonJsPlugin", evaluateToString("object"));

					new CommonJsRequireDependencyParserPlugin(options).apply(parser);
					new RequireResolveDependencyParserPlugin(options).apply(parser);
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("CommonJsPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("CommonJsPlugin", handler);
			}
		);
	}
}
module.exports = CommonJsPlugin;
