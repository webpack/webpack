/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("./Compilation");
const HotUpdateChunk = require("./HotUpdateChunk");
const NormalModule = require("./NormalModule");
const ConcatenatedModule = require("./optimize/ConcatenatedModule");
const { makePathsRelative } = require("./util/identifier");

/** @typedef {import("../declarations/plugins/SSRManifestPlugin").SSRManifestPluginOptions} SSRManifestPluginOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */

const PLUGIN_NAME = "SSRManifestPlugin";
const DEFAULT_FILENAME = "ssr-manifest.json";

/**
 * Yields the underlying source modules of a chunk module (unwrapping concatenation).
 * @param {Module} module a module contained in a chunk
 * @returns {Iterable<Module>} the source modules
 */
const sourceModules = (module) =>
	module instanceof ConcatenatedModule ? module.modules : [module];

class SSRManifestPlugin {
	/**
	 * Creates an instance of SSRManifestPlugin.
	 * @param {SSRManifestPluginOptions=} options options
	 */
	constructor(options = {}) {
		/** @type {SSRManifestPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => require("../schemas/plugins/SSRManifestPlugin.json"),
				this.options,
				{ name: PLUGIN_NAME, baseDataPath: "options" },
				(options) =>
					require("../schemas/plugins/SSRManifestPlugin.check")(options)
			);
		});

		const context = this.options.context || compiler.context;
		const filename = this.options.filename || DEFAULT_FILENAME;

		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
				},
				() => {
					const { chunkGraph } = compilation;
					const publicPath = compilation.getPath(
						compilation.outputOptions.publicPath || ""
					);
					const base = publicPath === "auto" ? "" : publicPath;

					/** @type {Map<string, Set<string>>} */
					const manifest = new Map();

					for (const chunk of compilation.chunks) {
						if (chunk instanceof HotUpdateChunk) continue;

						/** @type {string[]} */
						const files = [];
						for (const file of chunk.files) files.push(base + file);
						// Source maps are debug-only; keep them out of the preload manifest.
						for (const file of chunk.auxiliaryFiles) {
							if (!file.endsWith(".map")) files.push(base + file);
						}
						if (files.length === 0) continue;

						for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
							for (const source of sourceModules(module)) {
								if (!(source instanceof NormalModule)) continue;
								const key = makePathsRelative(context, source.resource);
								let set = manifest.get(key);
								if (set === undefined) manifest.set(key, (set = new Set()));
								for (const file of files) set.add(file);
							}
						}
					}

					/** @type {Record<string, string[]>} */
					const result = {};
					for (const key of [...manifest.keys()].sort()) {
						result[key] = [
							.../** @type {Set<string>} */ (manifest.get(key))
						].sort();
					}

					compilation.emitAsset(
						filename,
						new RawSource(JSON.stringify(result, null, 2)),
						{ manifest: true }
					);
				}
			);
		});
	}
}

module.exports = SSRManifestPlugin;
