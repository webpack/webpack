"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		chunkFilename: "chunk-[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
