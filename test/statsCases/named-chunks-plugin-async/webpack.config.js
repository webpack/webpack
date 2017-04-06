"use strict";

const NamedChunksPlugin = require("../../../lib/NamedChunksPlugin");
const RequestShortener = require("../../../lib/RequestShortener");

module.exports = {
	entry: {
		"entry": "./entry",
	},
	plugins: [
		new NamedChunksPlugin(function(chunk) {
			if(chunk.name) {
				return chunk.name;
			}
			const modulesToName = (mods) => mods.map((mod) => {
				const rs = new RequestShortener(mod.context);
				return rs.shorten(mod.request).replace(/[.\/\\]/g, "_");
			}).join("-");

			if(chunk.modules.length > 0) {
				return `chunk-containing-${modulesToName(chunk.modules)}`;
			}

			return null;
		}),
	]
};
