var path = require("path");
var webpack = require("../../../../");
module.exports = {
	entry: "./test",
	recordsPath: path.resolve(__dirname, "../../../js/config/records/issue-295/records.json"),
	target: "node",
	node: {
		__dirname: false
	}
};
