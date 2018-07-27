"use strict";

const NamedChunksPlugin = require("../../../lib/NamedChunksPlugin");
const RequestShortener = require("../../../lib/RequestShortener");

module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: {
		entry: "./entry"
	},
	plugins: [
		new NamedChunksPlugin(function(chunk) {
			if (chunk.name) {
				return chunk.name;
			}
			const chunkModulesToName = chunk =>
				Array.from(chunk.modulesIterable, mod => {
					const rs = new RequestShortener(mod.context);
					return rs.shorten(mod.request).replace(/[./\\]/g, "_");
				}).join("-");

			if (chunk.getNumberOfModules() > 0) {
				return `chunk-containing-${chunkModulesToName(chunk)}`;
			}

			return null;
		})
	]
};
