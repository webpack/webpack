var path = require("path");

module.exports = [
	{
		entry: path.resolve(__dirname, "./index"),
		stats: "errors-only"
	},
	{
		entry: path.resolve(__dirname, "./index2"),
		stats: "errors-only"
	}
];
