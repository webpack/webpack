var path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./test",
	recordsPath: path.resolve(
		__dirname,
		"../../../js/config/records/issue-295/records.json"
	),
	target: "node",
	node: {
		__dirname: false
	}
};
