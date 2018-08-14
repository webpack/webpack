"use strict";

const NamedChunksPlugin = require("../../../lib/NamedChunksPlugin");
const RequestShortener = require("../../../lib/RequestShortener");
const { compareModulesById } = require("../../../lib/util/comparators");

module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: {
		entry: "./entry"
	},
	plugins: [
		new NamedChunksPlugin(function(chunk, { chunkGraph }) {
			if (chunk.name) {
				return chunk.name;
			}
			const chunkModulesToName = chunk =>
				Array.from(
					chunkGraph.getOrderedChunkModulesIterable(chunk, compareModulesById),
					mod => {
						const rs = new RequestShortener(mod.context);
						return rs.shorten(mod.request).replace(/[./\\]/g, "_");
					}
				).join("-");

			if (chunkGraph.getNumberOfChunkModules(chunk) > 0) {
				return `chunk-containing-${chunkModulesToName(chunk)}`;
			}

			return null;
		})
	]
};
