/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Joel Denning @joeldenning
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const ExternalModule = require("./ExternalModule");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");

/** @typedef {import("./Compiler")} Compiler */

/**
 * @typedef {Object} SystemTemplatePluginOptions
 * @param {string=} name the library name
 */

class SystemTemplatePlugin {
	/**
	 * @param {SystemTemplatePluginOptions} options the plugin options
	 */
	constructor(options) {
		this.name = options.name;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("SystemTemplatePlugin", compilation => {
			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				"SystemTemplatePlugin",
				(chunk, set) => {
					set.add(RuntimeGlobals.returnExportsFromRuntime);
				}
			);

			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

			hooks.render.tap(
				"SystemTemplatePlugin",
				(source, { chunk, chunkGraph }) => {
					if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return source;

					const modules = chunkGraph
						.getChunkModules(chunk)
						.filter(m => m instanceof ExternalModule);
					const externals = /** @type {ExternalModule[]} */ (modules);

					// The name this bundle should be registered as with System
					const name = this.name
						? `${JSON.stringify(compilation.getPath(this.name, { chunk }))}, `
						: "";

					// The array of dependencies that are external to webpack and will be provided by System
					const systemDependencies = JSON.stringify(
						externals.map(m =>
							typeof m.request === "object" && !Array.isArray(m.request)
								? m.request.amd
								: m.request
						)
					);

					// The name of the variable provided by System for exporting
					const dynamicExport = "__WEBPACK_DYNAMIC_EXPORT__";

					// An array of the internal variable names for the webpack externals
					const externalWebpackNames = externals.map(
						m =>
							`__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
								`${chunkGraph.getModuleId(m)}`
							)}__`
					);

					// Declaring variables for the internal variable names for the webpack externals
					const externalVarDeclarations =
						externalWebpackNames.length > 0
							? `var ${externalWebpackNames.join(", ")};`
							: "";

					// The system.register format requires an array of setter functions for externals.
					const setters =
						externalWebpackNames.length === 0
							? ""
							: Template.asString([
									"setters: [",
									Template.indent(
										externalWebpackNames
											.map(external =>
												Template.asString([
													"function(module) {",
													Template.indent(`${external} = module;`),
													"}"
												])
											)
											.join(",\n")
									),
									"],"
							  ]);

					return new ConcatSource(
						Template.asString([
							`System.register(${name}${systemDependencies}, function(${dynamicExport}) {`,
							Template.indent([
								externalVarDeclarations,
								"return {",
								Template.indent([
									setters,
									"execute: function() {",
									Template.indent(`${dynamicExport}(`)
								])
							])
						]) + "\n",
						source,
						"\n" +
							Template.asString([
								Template.indent([
									Template.indent([Template.indent([");"]), "}"]),
									"};"
								]),
								"})"
							])
					);
				}
			);

			hooks.chunkHash.tap(
				"SystemTemplatePlugin",
				(chunk, hash, { chunkGraph }) => {
					if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
					hash.update("exports system");
					if (this.name) {
						hash.update(compilation.getPath(this.name, { chunk }));
					}
				}
			);
		});
	}
}

module.exports = SystemTemplatePlugin;
