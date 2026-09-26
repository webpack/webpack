/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const HotUpdateChunk = require("../graph/HotUpdateChunk");

/** @import Compiler from "../Compiler" */
/** @import Chunk, { ChunkName, ChunkId } from "../graph/Chunk" */
/** @import { AssetInfo } from "../Compilation" */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
 */

/**
 * A path that is neither empty nor absolute.
 * @minLength 1
 * @absolutePath false
 * @typedef {string} NonEmptyRelativePath
 */

/**
 * The name of file.
 * @inline
 * @typedef {NonEmptyString} ManifestImportName
 */

/**
 * The entrypoint name.
 * @inline
 * @typedef {NonEmptyString} ManifestParentName
 */

/**
 * Describes a manifest entrypoint.
 * @typedef {object} ManifestEntrypoint
 * @property {ManifestImportName[]} imports Contains the names of entrypoints.
 * @property {ManifestParentName[]=} parents Contains the names of parent entrypoints.
 */

/**
 * Describes a manifest asset that links the emitted path to the producing asset.
 * @typedef {object} ManifestItem
 * @property {string} file The path absolute URL (this indicates that the path is absolute from the server's root directory) to file.
 * @property {string=} src The source path relative to the context.
 */

/**
 * The manifest object.
 * @typedef {object} ManifestObjectKnown
 * @property {Record<string, ManifestItem>} assets Contains the names of assets.
 * @property {Record<string, ManifestEntrypoint>} entrypoints Contains the names of entrypoints.
 */

/**
 * @additionalProperties
 * @typedef {Record<string, EXPECTED_ANY>} ManifestObjectUnknown
 */

/**
 * @typedef {ManifestObjectKnown & ManifestObjectUnknown} ManifestObject
 */

/**
 * @schema plugins/ManifestPlugin
 * @typedef {object} ManifestPluginOptions
 * @property {boolean=} entrypoints Enables/disables generation of the entrypoints manifest section.
 * @property {NonEmptyRelativePath=} filename Specifies the filename of the output file on disk. By default the plugin will emit `manifest.json` inside the 'output.path' directory.
 * @property {import("./ManifestPlugin").Filter=} filter Allows filtering the files which make up the manifest.
 * @property {import("./ManifestPlugin").Generate=} generate A function that receives the manifest object, modifies it, and returns the modified manifest.
 * @property {string=} prefix Specifies a path prefix for all keys in the manifest.
 * @property {import("./ManifestPlugin").Serialize=} serialize A function that receives the manifest object and returns the manifest string.
 */

/**
 * @inline
 * @tsType import('./ManifestPlugin').Filter
 * @typedef {(item: ManifestItem) => boolean} Filter
 */

/**
 * @inline
 * @tsType import('./ManifestPlugin').Generate
 * @typedef {(manifest: ManifestObject) => ManifestObject} Generate
 */

/**
 * @inline
 * @tsType import('./ManifestPlugin').Serialize
 * @typedef {(manifest: ManifestObject) => string} Serialize
 */

const PLUGIN_NAME = "ManifestPlugin";

/**
 * Returns extname.
 * @param {string} filename filename
 * @returns {string} extname
 */
const extname = (filename) => {
	const replaced = filename.replace(/\?.*/, "");
	const split = replaced.split(".");
	const last = split.pop();
	if (!last) return "";
	return last && /^(?:gz|br|map)$/i.test(last)
		? `${split.pop()}.${last}`
		: last;
};

const DEFAULT_PREFIX = "[publicpath]";
const DEFAULT_FILENAME = "manifest.json";

class ManifestPlugin {
	/**
	 * Creates an instance of ManifestPlugin.
	 * @param {ManifestPluginOptions} options options
	 */
	constructor(options = {}) {
		/** @type {ManifestPluginOptions} */
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
				() => require("../../schemas/plugins/ManifestPlugin.json"),
				this.options,
				{
					name: "ManifestPlugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../../schemas/plugins/ManifestPlugin.check")(options)
			);
		});

		const entrypoints =
			this.options.entrypoints !== undefined ? this.options.entrypoints : true;
		const serialize =
			this.options.serialize ||
			((manifest) => JSON.stringify(manifest, null, 2));

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
					 * Creates a hash reg exp.
					 * @param {string | string[]} value value
					 * @returns {RegExp} regexp to remove hash
					 */
					const createHashRegExp = (value) =>
						new RegExp(
							`(?:\\.${Array.isArray(value) ? `(${value.join("|")})` : value})(?=\\.)`,
							"gi"
						);

					/**
					 * Removes the provided name from the manifest plugin.
					 * @param {string} name name
					 * @param {AssetInfo | null} info asset info
					 * @returns {string} hash removed name
					 */
					const removeHash = (name, info) => {
						// Handles hashes that match configured `hashDigestLength`
						// i.e. index.XXXX.html -> index.html (html-webpack-plugin)
						if (hashDigestLength <= 0) return name;
						const reg = createHashRegExp(`[a-f0-9]{${hashDigestLength},32}`);
						return name.replace(reg, "");
					};

					/**
					 * Returns chunk name or chunk id.
					 * @param {Chunk} chunk chunk
					 * @returns {ChunkName | ChunkId} chunk name or chunk id
					 */
					const getName = (chunk) => {
						if (chunk.name) return chunk.name;

						return chunk.id;
					};

					/** @type {ManifestObject} */
					let manifest = {};

					if (entrypoints) {
						/** @type {ManifestObject["entrypoints"]} */
						const entrypoints = {};

						for (const [name, entrypoint] of compilation.entrypoints) {
							/** @type {string[]} */
							const imports = [];

							for (const chunk of entrypoint.chunks) {
								for (const file of chunk.files) {
									const name = getName(chunk);

									imports.push(name ? `${name}.${extname(file)}` : file);
								}
							}

							/** @type {ManifestEntrypoint} */
							const item = { imports };
							const parents = entrypoint
								.getParents()
								.map((item) => /** @type {string} */ (item.name));

							if (parents.length > 0) {
								item.parents = parents;
							}

							entrypoints[name] = item;
						}

						manifest.entrypoints = entrypoints;
					}

					/** @type {ManifestObject["assets"]} */
					const assets = {};

					/** @type {Set<string>} */
					const added = new Set();

					/**
					 * Processes the provided file.
					 * @param {string} file file
					 * @param {string=} usedName usedName
					 * @returns {void}
					 */
					const handleFile = (file, usedName) => {
						if (added.has(file)) return;
						added.add(file);

						const asset = compilation.getAsset(file);
						if (!asset) return;
						const sourceFilename = asset.info.sourceFilename;
						const name =
							usedName ||
							sourceFilename ||
							// Fallback for unofficial plugins, just remove hash from filename
							removeHash(file, asset.info);

						const prefix = (this.options.prefix || DEFAULT_PREFIX).replace(
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

						const name = getName(chunk);

						for (const file of chunk.files) {
							handleFile(file, name ? `${name}.${extname(file)}` : file);
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
						this.options.filename || DEFAULT_FILENAME,
						new RawSource(serialize(manifest)),
						{ manifest: true }
					);
				}
			);
		});
	}
}

module.exports = ManifestPlugin;
