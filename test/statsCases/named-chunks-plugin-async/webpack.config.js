"use strict";

const webpack = require("../../../");
const RequestShortener = require("../../../lib/RequestShortener");
const { compareModulesByIdentifier } = require("../../../lib/util/comparators");

module.exports = {
	mode: "production",
	optimization: { chunkIds: false },
	entry: {
		entry: "./entry"
	},
	plugins: [
		new webpack.ids.NamedChunkIdsPlugin((chunk, { chunkGraph }) => {
			if (chunk.name) {
				return chunk.name;
			}
			const chunkModulesToName = chunk =>
				Array.from(
					chunkGraph.getOrderedChunkModulesIterable(
						chunk,
						compareModulesByIdentifier
					),
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
