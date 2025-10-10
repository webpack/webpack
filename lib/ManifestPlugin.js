/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const path = require("path");
const { RawSource } = require("webpack-sources");
const Compilation = require("./Compilation");
const HotUpdateChunk = require("./HotUpdateChunk");
const createSchemaValidation = require("./util/create-schema-validation");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("..").StatsCompilation} StatsCompilation */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compilation").Asset} Asset */
/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./NormalModule")} NormalModule */
/** @typedef {import("./config/defaults").WebpackOptionsNormalizedWithDefaults} WebpackOptions */

/** @typedef {import("../declarations/plugins/ManifestPlugin").ManifestPluginOptions} ManifestPluginOptions */
/** @typedef {import("../declarations/plugins/ManifestPlugin").ManifestObject} ManifestObject */
/** @typedef {import("../declarations/plugins/ManifestPlugin").ManifestEntrypoint} ManifestEntrypoint */
/** @typedef {import("../declarations/plugins/ManifestPlugin").ManifestItem} ManifestItem */

const PLUGIN_NAME = "ManifestPlugin";

const validate = createSchemaValidation(
	require("../schemas/plugins/ManifestPlugin.check"),
	() => require("../schemas/plugins/ManifestPlugin.json"),
	{
		name: "ManifestPlugin",
		baseDataPath: "options"
	}
);

class ManifestPlugin {
	/**
	 * @param {ManifestPluginOptions} options options
	 */
	constructor(options) {
		validate(options);

		/** @type {ManifestPluginOptions & Required<Omit<ManifestPluginOptions,  "filter" | "generate">>} */
		this.options = {
			filename: "manifest.json",
			prefix: "[publicpath]",
			entrypoints: true,
			serialize: (manifest) => JSON.stringify(manifest, null, 2),
			...options
		};
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
				},
				() => {
					const hashDigestLength = compilation.outputOptions.hashDigestLength;
					const publicPath = compilation.getPath(
						compilation.outputOptions.publicPath
					);

					/**
					 * @param {string | string[]} value value
					 * @returns {RegExp} regexp to remove hash
					 */
					const createHashRegExp = (value) =>
						new RegExp(
							`(?:\\.${Array.isArray(value) ? `(${value.join("|")})` : value})(?=\\.)`,
							"gi"
						);

					/**
					 * @param {string} name name
					 * @param {AssetInfo | null} info asset info
					 * @returns {string} hash removed name
					 */
					const removeHash = (name, info) => {
						if (info) {
							const { contenthash, chunkhash, fullhash } = info;
							if (contenthash) {
								name = name.replace(createHashRegExp(contenthash), "");
							}
							if (chunkhash) {
								name = name.replace(createHashRegExp(chunkhash), "");
							}
							if (fullhash) {
								name = name.replace(createHashRegExp(fullhash), "");
							}
						}

						// Handles hashes that match configured `hashDigestLength`
						// i.e. index.XXXX.html -> index.html (html-webpack-plugin)
						if (hashDigestLength <= 0) return name;
						const reg = createHashRegExp(`[a-f0-9]{${hashDigestLength},32}`);
						return name.replace(reg, "");
					};

					/** @type {ManifestObject} */
					let manifest = {};

					if (this.options.entrypoints) {
						/** @type {ManifestObject["entrypoints"]} */
						const entrypoints = {};

						for (const [name, entrypoint] of compilation.entrypoints) {
							const imports = [];

							for (const chunk of entrypoint.chunks) {
								for (const file of chunk.files) {
									const asset = compilation.getAsset(file);
									imports.push(removeHash(file, asset ? asset.info : null));
								}
							}

							entrypoints[name] = {
								imports,
								parents: entrypoint
									.getParents()
									.map((item) => /** @type {string} */ (item.name))
							};
						}

						manifest.entrypoints = entrypoints;
					}

					/** @type {ManifestObject["assets"]} */
					const assets = {};

					/** @type {Set<string>} */
					const added = new Set();

					/**
					 * @param {string} file file
					 * @returns {void}
					 */
					const handleFile = (file) => {
						if (added.has(file)) return;
						added.add(file);

						const asset = compilation.getAsset(file);
						if (!asset) return;
						const sourceFilename = asset.info.sourceFilename;
						const name = sourceFilename
							? path.join(path.dirname(file), path.basename(sourceFilename))
							: removeHash(file, asset.info);

						const prefix = this.options.prefix.replace(
							/\[publicpath\]/gi,
							() => (publicPath === "auto" ? "/" : publicPath)
						);
						/** @type {ManifestItem} */
						const item = { file: prefix + file };

						if (sourceFilename) {
							item.src = sourceFilename;
						}

						if (this.options.filter) {
							const needKeep = this.options.filter(item);

							if (!needKeep) {
								return;
							}
						}

						assets[name] = item;
					};

					for (const chunk of compilation.chunks) {
						if (chunk instanceof HotUpdateChunk) continue;

						for (const auxiliaryFile of chunk.auxiliaryFiles) {
							handleFile(auxiliaryFile);
						}

						for (const file of chunk.files) {
							handleFile(file);
						}
					}

					for (const asset of compilation.getAssets()) {
						if (asset.info.hotModuleReplacement) {
							continue;
						}

						handleFile(asset.name);
					}

					manifest.assets = assets;

					if (this.options.generate) {
						manifest = this.options.generate(manifest);
					}

					compilation.emitAsset(
						this.options.filename,
						new RawSource(this.options.serialize(manifest)),
						{ manifest: true }
					);
				}
			);
		});
	}
}

module.exports = ManifestPlugin;
