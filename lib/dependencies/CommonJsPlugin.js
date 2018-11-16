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

const NullFactory = require("../NullFactory");

const CommonJsRequireDependencyParserPlugin = require("./CommonJsRequireDependencyParserPlugin");
const RequireResolveDependencyParserPlugin = require("./RequireResolveDependencyParserPlugin");

const RuntimeGlobals = require("../RuntimeGlobals");

const {
	evaluateToIdentifier,
	evaluateToString,
	toConstantDependency
} = require("../JavascriptParserHelpers");

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

				compilation.dependencyFactories.set(
					RequireResolveHeaderDependency,
					new NullFactory()
				);
				compilation.dependencyTemplates.set(
					RequireResolveHeaderDependency,
					new RequireResolveHeaderDependency.Template()
				);

				compilation.dependencyFactories.set(
					RequireHeaderDependency,
					new NullFactory()
				);
				compilation.dependencyTemplates.set(
					RequireHeaderDependency,
					new RequireHeaderDependency.Template()
				);

				const handler = (parser, parserOptions) => {
					if (parserOptions.commonjs !== undefined && !parserOptions.commonjs)
						return;

					const requireExpressions = [
						"require",
						"require.resolve",
						"require.resolveWeak"
					];
					for (let expression of requireExpressions) {
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
							.tap("CommonJsPlugin", evaluateToIdentifier(expression, true));
					}

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
						parser.state.current.addDependency(dep);
						parser.scope.definitions.add("require");
						return true;
					});
					parser.hooks.canRename
						.for("require")
						.tap("CommonJsPlugin", () => true);
					parser.hooks.rename.for("require").tap("CommonJsPlugin", expr => {
						// define the require variable. It's still undefined, but not "not defined".
						const dep = new ConstDependency("var require;", 0);
						dep.loc = expr.loc;
						parser.state.current.addDependency(dep);
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
