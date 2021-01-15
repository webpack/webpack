/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		chunkFilename: "js/chunks/c.js"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map"
};
