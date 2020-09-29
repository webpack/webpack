/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	entry: {
		"foo/bar": "./"
	},
	target: "node",
	optimization: {
		chunkIds: "named",
		moduleIds: "named"
	}
};
