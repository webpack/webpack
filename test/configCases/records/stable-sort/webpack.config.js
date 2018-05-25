var path = require("path");

module.exports = {
	mode: "development",
	entry: "./test",
	recordsOutputPath: path.resolve(
		__dirname,
		"../../../js/config/records/stable-sort/records.json"
	),
	optimization: {
		namedChunks: false
	},
	target: "node",
	node: {
		__dirname: false
	}
};
