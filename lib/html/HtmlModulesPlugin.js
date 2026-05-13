/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const EntryPlugin = require("../EntryPlugin");
const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const ConstDependency = require("../dependencies/ConstDependency");
const HtmlScriptSrcDependency = require("../dependencies/HtmlScriptSrcDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const removeBOM = require("../util/removeBOM");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlParser = require("./HtmlParser");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {{ request: string, entryName: string, kind: "classic" | "esm-script" | "modulepreload" }} EntryScriptInfo */

const PLUGIN_NAME = "HtmlModulesPlugin";

class HtmlModulesPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		// `<script src>` and `<link rel="modulepreload">` references collected
		// by HtmlParser become real compilation entries here. The classic
		// and esm-script groups are chained via a leader-only dependOn so
		// they share a runtime — the first entry of the group owns it and
		// every subsequent entry sets `dependOn: [leader]`. Modulepreload
		// entries are emitted as independent entries (no dependOn) so they
		// can never be imported as a runtime leader by a later script —
		// that's what keeps the "preload but don't execute" contract of
		// `<link rel="modulepreload">` intact.
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

				for (const [groupKind, group] of Object.entries(htmlEntryScripts)) {
					const isChainGroup = groupKind !== "modulepreload";
					/** @type {string | undefined} */
					let leaderName;
					for (const entry of group) {
						const dependOn =
							isChainGroup && leaderName !== undefined
								? [leaderName]
								: undefined;
						if (isChainGroup && leaderName === undefined) {
							leaderName = entry.entryName;
						}
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
				// `ConstDependency` is used by HtmlParser to insert
				// ` type="module"` into the rewritten <script> tag when
				// `output.module` is on. Register its template so the HTML
				// generator runs the insertion.
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);
				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(
						PLUGIN_NAME,
						() =>
							new HtmlParser(
								compilation.outputOptions.hashFunction,
								compiler.context,
								compilation.outputOptions.module
							)
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
