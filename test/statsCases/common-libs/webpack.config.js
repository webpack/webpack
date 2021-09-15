/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		react: "./react"
	},
	optimization: {
		minimize: true,
		chunkIds: "named"
	}
};
