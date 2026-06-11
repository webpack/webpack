/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const { UsageState } = require("../ExportsInfo");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const ConstValueParserPlugin = require("./ConstValueParserPlugin");
const { InlinedUsedName, enableInlineExports } = require("./InlineExports");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ExportsInfo")} ExportsInfo */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

const PLUGIN_NAME = "InlineExportsPlugin";

class InlineExportsPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				// Lets HarmonyImportSpecifierDependency.getCondition skip the inline check
				// (and stay unconditional) when this plugin is not active
				enableInlineExports(compilation.moduleGraph);
				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					new ConstValueParserPlugin().apply(parser);
				};
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);

				const moduleGraph = compilation.moduleGraph;
				compilation.hooks.optimizeDependencies.tap(PLUGIN_NAME, (modules) => {
					/** @type {Set<ExportsInfo>} */
					const visited = new Set();
					/** @type {ExportsInfo[]} */
					let queue = [];
					for (const module of modules) {
						queue.push(moduleGraph.getExportsInfo(module));
					}
					while (queue.length > 0) {
						const items = queue;
						queue = [];
						for (const exportsInfo of items) {
							if (visited.has(exportsInfo)) continue;
							visited.add(exportsInfo);
							// Other-export usage means we can't safely inline (some non-statically-known consumer)
							if (
								exportsInfo.otherExportsInfo.getUsed(undefined) !==
								UsageState.Unused
							) {
								continue;
							}
							for (const exportInfo of exportsInfo.ownedExports) {
								const inlined = exportInfo.canInline();
								const doInline =
									!exportInfo.hasUsedName() &&
									inlined !== undefined &&
									exportInfo.provided === true;
								if (doInline) {
									exportInfo.setUsedName(new InlinedUsedName(inlined));
									exportsInfo.markInlinedExports();
								}
								if (exportInfo.exportsInfoOwned && exportInfo.exportsInfo) {
									const used = exportInfo.getUsed(undefined);
									if (
										used === UsageState.OnlyPropertiesUsed ||
										used === UsageState.Unused
									) {
										queue.push(exportInfo.exportsInfo);
									}
								}
							}
						}
					}
				});
			}
		);
	}
}

module.exports = InlineExportsPlugin;
