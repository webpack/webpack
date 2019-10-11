/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const ExternalModule = require("./ExternalModule");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");

/** @typedef {import("./Compiler")} Compiler */

/**
 * @typedef {Object} AmdTemplatePluginOptions
 * @param {string=} name the library name
 * @property {boolean=} requireAsWrapper
 */

class AmdTemplatePlugin {
	/**
	 * @param {AmdTemplatePluginOptions} options the plugin options
	 */
	constructor(options) {
		if (!options || typeof options === "string") {
			this.name = options;
			this.requireAsWrapper = false;
		} else {
			this.name = options.name;
			this.requireAsWrapper = options.requireAsWrapper;
		}
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("AmdTemplatePlugin", compilation => {
			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				"AmdTemplatePlugin",
				(chunk, set) => {
					set.add(RuntimeGlobals.returnExportsFromRuntime);
				}
			);

			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

			hooks.render.tap(
				"AmdTemplatePlugin",
				(source, { chunk, runtimeTemplate, chunkGraph }) => {
					if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return source;
					const modern = runtimeTemplate.supportsArrowFunction();
					const modules = chunkGraph
						.getChunkModules(chunk)
						.filter(m => m instanceof ExternalModule);
					const externals = /** @type {ExternalModule[]} */ (modules);
					const externalsDepsArray = JSON.stringify(
						externals.map(m =>
							typeof m.request === "object" && !Array.isArray(m.request)
								? m.request.amd
								: m.request
						)
					);
					const externalsArguments = externals
						.map(
							m =>
								`__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
									`${chunkGraph.getModuleId(m)}`
								)}__`
						)
						.join(", ");

					const fnStart = modern
						? `(${externalsArguments}) => `
						: `function(${externalsArguments}) { return `;
					const fnEnd = modern ? "" : "}";

					if (this.requireAsWrapper) {
						return new ConcatSource(
							`require(${externalsDepsArray}, ${fnStart}`,
							source,
							`${fnEnd});`
						);
					} else if (this.name) {
						const name = compilation.getPath(this.name, {
							chunk
						});

						return new ConcatSource(
							`define(${JSON.stringify(
								name
							)}, ${externalsDepsArray}, ${fnStart}`,
							source,
							`${fnEnd});`
						);
					} else if (externalsArguments) {
						return new ConcatSource(
							`define(${externalsDepsArray}, ${fnStart}`,
							source,
							`${fnEnd});`
						);
					} else {
						return new ConcatSource(`define(${fnStart}`, source, `${fnEnd});`);
					}
				}
			);

			hooks.chunkHash.tap(
				"AmdTemplatePlugin",
				(chunk, hash, { chunkGraph }) => {
					if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
					hash.update("exports amd");
					if (this.requireAsWrapper) {
						hash.update("requireAsWrapper");
					} else if (this.name) {
						const name = compilation.getPath(this.name, {
							chunk
						});
						hash.update(name);
					}
				}
			);
		});
	}
}

module.exports = AmdTemplatePlugin;
