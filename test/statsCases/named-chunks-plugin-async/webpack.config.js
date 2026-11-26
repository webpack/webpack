"use strict";

const {
	ids: { NamedChunkIdsPlugin }
} = require("../../../");

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: { chunkIds: false },
	entry: {
		entry: "./entry"
	},
	plugins: [new NamedChunkIdsPlugin()]
};
