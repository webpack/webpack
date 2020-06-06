var path = require("path");

/** @type {function(any, any): import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	entry: "./test",
	recordsPath: path.resolve(testPath, "records.json"),
	target: "node",
	node: {
		__dirname: false
	}
});
