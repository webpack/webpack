/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const path = require("path");
const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const HotUpdateChunk = require("../HotUpdateChunk");
const createSchemaValidation = require("../util/create-schema-validation");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("..").StatsCompilation} StatsCompilation */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation").Asset} Asset */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../config/defaults").WebpackOptionsNormalizedWithDefaults} WebpackOptions */

/** @typedef {import("../../declarations/plugins/ManifestPlugin").ManifestPluginOptions} ManifestPluginOptions */

const PLUGIN_NAME = "ManifestPlugin";

const validate = createSchemaValidation(
	require("../../schemas/plugins/ManifestPlugin.check"),
	() => require("../../schemas/plugins/ManifestPlugin.json"),
	{
		name: "ManifestPlugin",
		baseDataPath: "options"
	}
);

/**
 * @param {string} filename filename
 * @returns {string} extname
 */
const extname = (filename) => {
	const replaced = filename.replace(/\?.*/, "");
	const split = replaced.split(".");
	const last = split.pop();
	if (!last) return "";
	return last && /^(gz|map)$/i.test(last) ? `${split.pop()}.${last}` : last;
};

class ManifestPlugin {
	/**
	 * @param {ManifestPluginOptions} options options
	 */
	constructor(options) {
		validate(options);

		/** @type {Required<ManifestPluginOptions>} */
		this.options = {
			filename: "manifest.json",
			handle: (manifest, _stats) => JSON.stringify(manifest, null, 2),
			...options
		};
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {WeakMap<Compilation, StatsCompilation>} */
		const cachedStats = new WeakMap();

		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
				},
				() => {
					let stats =
						/** @type {StatsCompilation | undefined} */ cachedStats.get(
							compilation
						);
					if (!stats) {
						stats = compilation.getStats().toJson({
							all: false,
							assets: true,
							cachedAssets: true,
							assetsSpace: Infinity,
							publicPath: true
						});
						cachedStats.set(compilation, stats);
					}

					/** @type {Set<string>} */
					const added = new Set();
					/**
					 * @type {{name: string, file: string}[]}
					 */
					const items = [];

					/**
					 * @param {string} file file
					 * @param {((file: string) => string)=} namer namer
					 * @returns {void}
					 */
					const handleFile = (file, namer) => {
						if (added.has(file)) return;
						added.add(file);

						let name = namer ? namer(file) : file;
						const asset = compilation.getAsset(file);
						if (asset && asset.info.sourceFilename) {
							name = path.join(
								path.dirname(file),
								path.basename(asset.info.sourceFilename)
							);
						}
						items.push({ name, file });
					};

					for (const chunk of compilation.chunks) {
						if (chunk instanceof HotUpdateChunk) continue;

						const chunkName = chunk.name;
						for (const auxiliaryFile of chunk.auxiliaryFiles) {
							handleFile(auxiliaryFile, (file) => path.basename(file));
						}
						for (const file of chunk.files) {
							handleFile(file, (file) => {
								if (chunkName) return `${chunkName}.${extname(file)}`;
								return file;
							});
						}
					}

					if (stats.assets) {
						for (const asset of stats.assets) {
							if (asset.info.hotModuleReplacement) {
								continue;
							}
							handleFile(asset.name);
						}
					}

					/** @type {Record<string, string>} */
					const manifest = {};
					const hashDigestLength = compilation.outputOptions.hashDigestLength;

					/**
					 * @param {string} name name
					 * @returns {string} hash removed name
					 */
					const removeHash = (name) => {
						// Handles hashes that match configured `hashDigestLength`
						// i.e. index.XXXX.html -> index.html (html-webpack-plugin)
						if (hashDigestLength <= 0) return name;
						const reg = new RegExp(
							`(\\.[a-f0-9]{${hashDigestLength}})(?=\\.)`,
							"gi"
						);
						return name.replace(reg, "");
					};

					for (const { name, file } of items) {
						manifest[removeHash(name)] = stats.publicPath
							? stats.publicPath +
								(stats.publicPath.endsWith("/") ? `${file}` : `/${file}`)
							: file;
					}

					compilation.emitAsset(
						this.options.filename,
						new RawSource(this.options.handle(manifest, stats))
					);
				}
			);
		});
	}
}

module.exports = ManifestPlugin;
