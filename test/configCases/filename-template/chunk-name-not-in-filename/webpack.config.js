"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	optimization: { chunkIds: "deterministic" },
	output: {
		chunkFilename: "[id].js"
	}
};
