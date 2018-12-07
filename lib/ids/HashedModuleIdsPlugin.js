/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/HashedModuleIdsPlugin.json");
const RequestShortener = require("../RequestShortener");
const {
	compareModulesByPreOrderIndexOrIdentifier
} = require("../util/comparators");
const createHash = require("../util/createHash");
const { getUsedModuleIds } = require("./IdHelpers");

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
			compilation.hooks.moduleIds.tap("HashedModuleIdsPlugin", modules => {
				const chunkGraph = compilation.chunkGraph;
				const requestShortener = this.options.context
					? new RequestShortener(this.options.context)
					: compilation.requestShortener;

				const usedIds = getUsedModuleIds(compilation);
				const modulesInNaturalOrder = Array.from(modules)
					.filter(m => {
						if (chunkGraph.getNumberOfModuleChunks(m) === 0) return false;
						return chunkGraph.getModuleId(module) === null;
					})
					.sort(
						compareModulesByPreOrderIndexOrIdentifier(compilation.moduleGraph)
					);
				for (const module of modulesInNaturalOrder) {
					const ident = requestShortener.shorten(module.identifier());
					const hash = createHash(options.hashFunction);
					hash.update(ident || "");
					const hashId = hash.digest(options.hashDigest);
					let len = options.hashDigestLength;
					while (usedIds.has(hashId.substr(0, len))) len++;
					const moduleId = hashId.substr(0, len);
					chunkGraph.setModuleId(module, moduleId);
					usedIds.add(moduleId);
				}
			});
		});
	}
}

module.exports = HashedModuleIdsPlugin;
