var path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./test",
	recordsOutputPath: path.resolve(
		__dirname,
		"../../../js/config/records/stable-sort/records.json"
	),
	optimization: {
		chunkIds: "size"
	},
	target: "node",
	node: {
		__dirname: false
	}
};
