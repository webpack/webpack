"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	optimization: { chunkIds: "named" },
	output: {
		chunkFilename: "[id].js"
	}
};
