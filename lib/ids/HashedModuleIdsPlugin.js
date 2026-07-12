/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import { DEFAULTS } from "../config/defaults.js";
import { compareModulesByPreOrderIndexOrIdentifier } from "../util/comparators.js";
import createHash from "../util/createHash.js";
import { getFullModuleName, getUsedModuleIdsAndModules } from "./IdHelpers.js";

const require = createRequire(import.meta.url);
/** @typedef {import("../../declarations/plugins/ids/HashedModuleIdsPlugin.js").HashedModuleIdsPluginOptions} HashedModuleIdsPluginOptions */
/** @typedef {import("../Compiler.js").default} Compiler */

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
					/** @type {typeof import("../../schemas/plugins/ids/HashedModuleIdsPlugin.check.js")} */ (
						require("../../schemas/plugins/ids/HashedModuleIdsPlugin.check.js")
					)(options)
			);
		});
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.moduleIds.tap(PLUGIN_NAME, () => {
				const chunkGraph = compilation.chunkGraph;
				const context = this.options.context || compiler.context;

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

export default HashedModuleIdsPlugin;

export { HashedModuleIdsPlugin as "module.exports" };
