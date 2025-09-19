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
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../config/defaults").WebpackOptionsNormalizedWithDefaults} WebpackOptions */

/** @typedef {import("../../declarations/plugins/ManifestPlugin").ManifestPluginOptions} ManifestPluginOptions */

/**
 * @typedef {object} Asset
 * @property {string} name
 * @property {string} path
 */

/**
 * @typedef {{ name: string, stage: number }} TapOptions
 */

/** @type {TapOptions} */
const TAP_OPTIONS = {
	name: "ManifestPlugin",
	stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
};

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

		const defaultOptions = {
			filename: "manifest.json"
		};

		/** @type {Required<ManifestPluginOptions>} */
		this.options = Object.assign(defaultOptions, options);
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {Map<string,Module>} */
		const moduleAssets = new Map();

		const outputFilename = path.resolve(
			/** @type {WebpackOptions} */ (compiler.options).output.path,
			this.options.filename
		);
		const manifestAssetName = path.relative(
			/** @type {WebpackOptions} */ (compiler.options).output.path,
			outputFilename
		);

		compiler.hooks.compilation.tap(TAP_OPTIONS, (compilation) => {
			compilation.hooks.moduleAsset.tap(TAP_OPTIONS, (module, asset) => {
				moduleAssets.set(asset, module);
			});
		});

		compiler.hooks.thisCompilation.tap(TAP_OPTIONS, (compilation) => {
			compilation.hooks.processAssets.tap(TAP_OPTIONS, () => {
				const stats = compilation.getStats().toJson({
					all: false,
					assets: true,
					cachedAssets: true,
					assetsSpace: Infinity,
					ids: true,
					publicPath: true
				});

				/** @type {Map<string, Asset>} */
				const mapByPath = new Map();

				/**
				 * @param {Asset} asset asset
				 * @returns {void}
				 */
				const addToMap = (asset) => {
					const { path } = asset;
					mapByPath.set(path, asset);
				};

				for (const chunk of compilation.chunks) {
					if (chunk instanceof HotUpdateChunk) continue;
					const chunkName = chunk.name;

					for (const auxiliaryFile of chunk.auxiliaryFiles) {
						addToMap({
							name: path.basename(auxiliaryFile),
							path: auxiliaryFile
						});
					}

					for (const chunkFilename of chunk.files) {
						const name = chunkName
							? `${chunkName}.${extname(chunkFilename)}`
							: chunkFilename;
						addToMap({
							name,
							path: chunkFilename
						});
					}
				}

				if (stats.assets) {
					// module assets are included in `chunk.auxiliaryFiles`, so we add them after chunk assets
					for (const asset of stats.assets) {
						let moduleAssetName;

						const module = /** @type {NormalModule} */ (
							moduleAssets.get(asset.name)
						);
						if (module && module.userRequest) {
							moduleAssetName = path.join(
								path.dirname(asset.name),
								path.basename(module.userRequest)
							);
						} else if (asset.info.sourceFilename) {
							moduleAssetName = path.join(
								path.dirname(asset.name),
								path.basename(asset.info.sourceFilename)
							);
						}
						if (moduleAssetName) {
							addToMap({
								name: moduleAssetName,
								path: asset.name
							});
							continue;
						}

						// We will handle them later
						if (
							(asset.chunks && asset.chunks.length > 0) ||
							(asset.auxiliaryChunks && asset.auxiliaryChunks.length > 0)
						) {
							continue;
						}

						addToMap({
							name: asset.name,
							path: asset.name
						});
					}
				}

				/** @type {Record<string,string>} */
				const manifest = {};
				const hashDigestLength = compilation.outputOptions.hashDigestLength;

				/**
				 * @param {string} name name
				 * @returns {string} hash removed name
				 */
				const removeHash = (name) => {
					if (hashDigestLength <= 0) return name;
					const reg = new RegExp(
						`(\\.[a-f0-9]{${hashDigestLength}})(?=\\.)?`,
						"gi"
					);
					return name.replace(reg, "");
				};

				for (const [_name, item] of mapByPath) {
					manifest[removeHash(item.name)] = stats.publicPath
						? stats.publicPath +
							(stats.publicPath.endsWith("/")
								? `${item.path}`
								: `/${item.path}`)
						: item.path;
				}

				compilation.emitAsset(
					manifestAssetName,
					new RawSource(JSON.stringify(manifest, null, 2))
				);

				moduleAssets.clear();
			});
		});
	}
}

module.exports = ManifestPlugin;
