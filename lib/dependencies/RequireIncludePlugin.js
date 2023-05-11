/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
} = require("../ModuleTypeConstants");
const RequireIncludeDependency = require("./RequireIncludeDependency");
const RequireIncludeDependencyParserPlugin = require("./RequireIncludeDependencyParserPlugin");

const PLUGIN_NAME = "RequireIncludePlugin";

class RequireIncludePlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
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
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}
module.exports = RequireIncludePlugin;
