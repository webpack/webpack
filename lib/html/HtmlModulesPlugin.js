/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlParser = require("./HtmlParser");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "HtmlModulesPlugin";

class HtmlModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				// TODO: register HtmlScriptDependency with dependencyFactories
				//       so webpack knows how to resolve <script src=""> dependencies
				// TODO: register HtmlLinkDependency with dependencyFactories
				//       so webpack knows how to resolve <link href=""> dependencies
				// TODO: register HtmlImgDependency with dependencyFactories
				//       so webpack knows how to resolve <img src=""> dependencies
				// TODO: add contentHash hook for HTML chunks
				// TODO: add renderManifest hook to write HTML to output

				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => new HtmlParser());

				normalModuleFactory.hooks.createGenerator
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => new HtmlGenerator());
			}
		);
	}
}

module.exports = HtmlModulesPlugin;
