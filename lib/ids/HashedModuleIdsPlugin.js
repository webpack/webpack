/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { DEFAULTS } = require("../config/defaults");
const {
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");
const createHash = require("../util/createHash");
const { fileUrlToPath } = require("../util/identifier");
const {
	getFullModuleName,
	getUsedModuleIdsAndModules
} = require("./IdHelpers");

/** @import Compiler from "../Compiler" */

/**
 * A number of at least one.
 * @minimum 1
 * @typedef {number} PositiveNumber
 */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
 */

/**
 * An absolute path.
 * @absolutePath true
 * @typedef {string} AbsolutePath
 */

/**
 * Algorithm used for generation the hash (see node.js crypto package).
 * @typedef {NonEmptyString | typeof import("../util/Hash")} HashFunction
 */

/**
 * @schema plugins/ids/HashedModuleIdsPlugin
 * @typedef {object} HashedModuleIdsPluginOptions
 * @property {AbsolutePath=} context The context directory for creating names.
 * @property {"base64" | "base64url" | "hex" | "binary" | "utf8" | "utf-8" | "utf16le" | "utf-16le" | "latin1" | "ascii" | "ucs2" | "ucs-2"=} hashDigest The encoding to use when generating the hash, defaults to 'base64'. All encodings from Node.JS' hash.digest are supported.
 * @property {PositiveNumber=} hashDigestLength The prefix length of the hash digest to use, defaults to 4.
 * @property {HashFunction=} hashFunction The hashing algorithm to use, defaults to 'md4'. All functions from Node.JS' crypto.createHash are supported.
 */

const PLUGIN_NAME = "HashedModuleIdsPlugin";

class HashedModuleIdsPlugin {
	/**
	 * Creates an instance of HashedModuleIdsPlugin.
	 * @param {HashedModuleIdsPluginOptions=} options options object
	 */
	constructor(options = {}) {
		/** @type {HashedModuleIdsPluginOptions} */
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
				() => require("../../schemas/plugins/ids/HashedModuleIdsPlugin.json"),
				this.options,
				{
					name: "Hashed Module Ids Plugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../../schemas/plugins/ids/HashedModuleIdsPlugin.check")(
						options
					)
			);
		});
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.moduleIds.tap(PLUGIN_NAME, () => {
				const chunkGraph = compilation.chunkGraph;
				const context = this.options.context
					? fileUrlToPath(this.options.context)
					: compiler.context;

				const [usedIds, modules] = getUsedModuleIdsAndModules(compilation);
				const modulesInNaturalOrder = modules.sort(
					compareModulesByPreOrderIndexOrIdentifier(compilation.moduleGraph)
				);
				for (const module of modulesInNaturalOrder) {
					const ident = getFullModuleName(module, context, compiler.root);
					const hash = createHash(
						this.options.hashFunction || DEFAULTS.HASH_FUNCTION
					);
					hash.update(ident || "");
					const hashId = hash.digest(this.options.hashDigest || "base64");
					let len = this.options.hashDigestLength || 4;
					while (usedIds.has(hashId.slice(0, len))) {
						/** @type {number} */ (len)++;
					}
					const moduleId = hashId.slice(0, len);
					chunkGraph.setModuleId(module, moduleId);
					usedIds.add(moduleId);
				}
			});
		});
	}
}

module.exports = HashedModuleIdsPlugin;
