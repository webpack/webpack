/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const EntryPlugin = require("../EntryPlugin");
const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const HtmlScriptSrcDependency = require("../dependencies/HtmlScriptSrcDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const removeBOM = require("../util/removeBOM");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlParser = require("./HtmlParser");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {{ request: string, entryName: string, kind: "classic" | "esm" }} EntryScriptInfo */

const PLUGIN_NAME = "HtmlModulesPlugin";

class HtmlModulesPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		// `<script src>` and `<link rel="modulepreload">` references collected
		// by HtmlParser become real compilation entries here. References are
		// grouped into classic (CommonJS-resolved) and esm (ESM-resolved) and
		// chained via `dependOn`: the first entry in each group provides the
		// runtime; every subsequent entry depends on all earlier entries in
		// the same group, so they share that runtime and modules don't get
		// duplicated across chunks.
		compiler.hooks.finishMake.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			/** @type {Promise<void>[]} */
			const promises = [];

			for (const module of compilation.modules) {
				if (module.type !== HTML_MODULE_TYPE) continue;
				const buildInfo = module.buildInfo;
				const htmlEntryScripts =
					buildInfo &&
					/** @type {Record<string, EntryScriptInfo[]> | undefined} */
					(buildInfo.htmlEntryScripts);
				if (!htmlEntryScripts) continue;

				const context = /** @type {string} */ (module.context);

				for (const group of Object.values(htmlEntryScripts)) {
					/** @type {string[]} */
					const previousNames = [];
					for (const entry of group) {
						const dependOn =
							previousNames.length > 0 ? [...previousNames] : undefined;
						previousNames.push(entry.entryName);
						promises.push(
							new Promise((resolve, reject) => {
								compilation.addEntry(
									context,
									EntryPlugin.createDependency(entry.request, {
										name: entry.entryName
									}),
									{
										name: entry.entryName,
										// Each script src / modulepreload entry gets its own
										// filename derived from the synthetic entry name so it
										// doesn't collide with the user's `output.filename`.
										filename:
											compilation.outputOptions.chunkFilename || "[name].js",
										dependOn
									},
									(err) => {
										if (err) reject(err);
										else resolve();
									}
								);
							})
						);
					}
				}
			}

			Promise.all(promises).then(
				() => callback(),
				(err) => callback(err)
			);
		});

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
				compilation.dependencyFactories.set(
					HtmlScriptSrcDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlScriptSrcDependency,
					new HtmlScriptSrcDependency.Template()
				);
				compilation.dependencyTemplates.set(
					StaticExportsDependency,
					new StaticExportsDependency.Template()
				);
				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(
						PLUGIN_NAME,
						() => new HtmlParser(compilation.outputOptions.hashFunction)
					);
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
