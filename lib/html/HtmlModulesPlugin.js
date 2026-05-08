/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const removeBOM = require("../util/removeBOM");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlParser = require("./HtmlParser");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "HtmlModulesPlugin";

class HtmlModulesPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					HtmlSourceDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlSourceDependency,
					new HtmlSourceDependency.Template()
				);
				compilation.dependencyTemplates.set(
					StaticExportsDependency,
					new StaticExportsDependency.Template()
				);
				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => new HtmlParser());
				normalModuleFactory.hooks.createGenerator
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => new HtmlGenerator());

				NormalModule.getCompilationHooks(compilation).processResult.tap(
					PLUGIN_NAME,
					(result, module) => {
						if (module.type === HTML_MODULE_TYPE) {
							const [source, ...rest] = result;

							return [removeBOM(source), ...rest];
						}

						return result;
					}
				);
			}
		);
	}
}

module.exports = HtmlModulesPlugin;
