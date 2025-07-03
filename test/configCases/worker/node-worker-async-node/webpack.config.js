/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "async-node14",
	entry: "./index.js",
	optimization: {
		chunkIds: "named"
	},
	output: {
		filename: "bundle.js"
	}
};
