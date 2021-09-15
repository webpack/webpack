"use strict";

const {
	ids: { NamedChunkIdsPlugin }
} = require("../../../");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: { chunkIds: false },
	entry: {
		entry: "./entry"
	},
	plugins: [new NamedChunkIdsPlugin()]
};
