/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/HashedModuleIdsPlugin.json");
const {
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");
const createHash = require("../util/createHash");

/** @typedef {import("../../declarations/plugins/HashedModuleIdsPlugin").HashedModuleIdsPluginOptions} HashedModuleIdsPluginOptions */

class HashedModuleIdsPlugin {
	/**
	 * @param {HashedModuleIdsPluginOptions=} options options object
	 */
	constructor(options = {}) {
		validateOptions(schema, options || {}, "Hashed Module Ids Plugin");

		/** @type {HashedModuleIdsPluginOptions} */
		this.options = Object.assign(
			{
				context: null,
				hashFunction: "md4",
				hashDigest: "base64",
				hashDigestLength: 4
			},
			options
		);
	}

	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap("HashedModuleIdsPlugin", compilation => {
			const usedIds = new Set();

			const assignIdToModule = (module, chunkGraph) => {
				const id = module.libIdent({
					context: this.options.context || compiler.options.context
				});
				if (id) {
					const hash = createHash(options.hashFunction);
					hash.update(id);
					const hashId = hash.digest(options.hashDigest);
					let len = options.hashDigestLength;
					while (usedIds.has(hashId.substr(0, len))) len++;
					const moduleId = hashId.substr(0, len);
					chunkGraph.setModuleId(module, moduleId);
					usedIds.add(moduleId);
				}
			};

			compilation.hooks.moduleIds.tap("HashedModuleIdsPlugin", modules => {
				const chunkGraph = compilation.chunkGraph;
				const modulesInNaturalOrder = Array.from(modules)
					.filter(m => chunkGraph.getNumberOfModuleChunks(m) > 0)
					.sort(
						compareModulesByPreOrderIndexOrIdentifier(compilation.moduleGraph)
					);
				for (const module of modulesInNaturalOrder) {
					if (chunkGraph.getModuleId(module) === null) {
						assignIdToModule(module, chunkGraph);
					}
				}
			});
			compilation.hooks.runtimeModule.tap("HashedModuleIdsPlugin", module => {
				assignIdToModule(module, compilation.chunkGraph);
			});
		});
	}
}

module.exports = HashedModuleIdsPlugin;
