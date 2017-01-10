var path = require("path");

module.exports = [
	{
		entry: path.resolve(__dirname, "./index"),
		stats: "none"
	},
	{
		entry: path.resolve(__dirname, "./index2"),
		stats: "none"
	}
];
