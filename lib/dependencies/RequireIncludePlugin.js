/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RequireIncludeDependency = require("./RequireIncludeDependency");
const RequireIncludeDependencyParserPlugin = require("./RequireIncludeDependencyParserPlugin");

class RequireIncludePlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"RequireIncludePlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					RequireIncludeDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					RequireIncludeDependency,
					new RequireIncludeDependency.Template()
				);

				const handler = (parser, parserOptions) => {
					if (parserOptions.requireInclude === false) return;
					const warn = parserOptions.requireInclude === undefined;

					new RequireIncludeDependencyParserPlugin(warn).apply(parser);
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("RequireIncludePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("RequireIncludePlugin", handler);
			}
		);
	}
}
module.exports = RequireIncludePlugin;
