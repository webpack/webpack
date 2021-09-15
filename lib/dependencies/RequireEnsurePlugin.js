/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RequireEnsureDependency = require("./RequireEnsureDependency");
const RequireEnsureItemDependency = require("./RequireEnsureItemDependency");

const RequireEnsureDependenciesBlockParserPlugin = require("./RequireEnsureDependenciesBlockParserPlugin");

const {
	evaluateToString,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");

class RequireEnsurePlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"RequireEnsurePlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					RequireEnsureItemDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					RequireEnsureItemDependency,
					new RequireEnsureItemDependency.Template()
				);

				compilation.dependencyTemplates.set(
					RequireEnsureDependency,
					new RequireEnsureDependency.Template()
				);

				const handler = (parser, parserOptions) => {
					if (
						parserOptions.requireEnsure !== undefined &&
						!parserOptions.requireEnsure
					)
						return;

					new RequireEnsureDependenciesBlockParserPlugin().apply(parser);
					parser.hooks.evaluateTypeof
						.for("require.ensure")
						.tap("RequireEnsurePlugin", evaluateToString("function"));
					parser.hooks.typeof
						.for("require.ensure")
						.tap(
							"RequireEnsurePlugin",
							toConstantDependency(parser, JSON.stringify("function"))
						);
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("RequireEnsurePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("RequireEnsurePlugin", handler);
			}
		);
	}
}
module.exports = RequireEnsurePlugin;
