var path = require("path");

module.exports = {
	entry: "./test",
	recordsOutputPath: path.resolve(
		__dirname,
		"../../../js/config/records/issue-7339/records.json"
	),
	optimization: {
		chunkIds: "total-size"
	},
	target: "node",
	node: {
		__dirname: false
	}
};
