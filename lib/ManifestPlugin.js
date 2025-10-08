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
/** @typedef {import("./Module")} Module */
/** @typedef {import("./NormalModule")} NormalModule */
/** @typedef {import("./config/defaults").WebpackOptionsNormalizedWithDefaults} WebpackOptions */

/** @typedef {import("../declarations/plugins/ManifestPlugin").ManifestPluginOptions} ManifestPluginOptions */
/** @typedef {import("../declarations/plugins/ManifestPlugin").ManifestObject} ManifestObject */
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

/**
 * @param {string} filename filename
 * @returns {string} extname
 */
const extname = (filename) => {
	const replaced = filename.replace(/\?.*/, "");
	const split = replaced.split(".");
	const last = split.pop();
	if (!last) return "";
	return last && /^(gz|br|map)$/i.test(last) ? `${split.pop()}.${last}` : last;
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
			handler: (manifest) => this._handleManifest(manifest),
			...options
		};
	}

	/**
	 * @param {ManifestObject} manifest manifest object
	 * @returns {string} manifest content
	 */
	_handleManifest(manifest) {
		return JSON.stringify(
			Object.keys(manifest).reduce((acc, cur) => {
				acc[cur] = manifest[cur].filePath;
				return acc;
			}, /** @type {Record<string, string>} */ ({})),
			null,
			2
		);
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
					const assets = compilation.getAssets();
					const hashDigestLength = compilation.outputOptions.hashDigestLength;
					const publicPath = compilation.getPath(
						compilation.outputOptions.publicPath
					);

					/** @type {Set<string>} */
					const added = new Set();
					/** @type {ManifestObject} */
					const manifest = {};

					/**
					 * @param {string} name name
					 * @returns {string} hash removed name
					 */
					const removeHash = (name) => {
						// Handles hashes that match configured `hashDigestLength`
						// i.e. index.XXXX.html -> index.html (html-webpack-plugin)
						if (hashDigestLength <= 0) return name;
						const reg = new RegExp(
							`(\\.[a-f0-9]{${hashDigestLength},32})(?=\\.)`,
							"gi"
						);
						return name.replace(reg, "");
					};

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
						manifest[removeHash(name)] = {
							filePath: publicPath
								? publicPath +
									(publicPath.endsWith("/") ? `${file}` : `/${file}`)
								: file,
							asset
						};
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

					for (const asset of assets) {
						if (asset.info.hotModuleReplacement) {
							continue;
						}
						handleFile(asset.name);
					}

					compilation.emitAsset(
						this.options.filename,
						new RawSource(this.options.handler(manifest))
					);
				}
			);
		});
	}
}

module.exports = ManifestPlugin;
