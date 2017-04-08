var path = require("path");

module.exports = [
	{
		entry: path.resolve(__dirname, "./index"),
		watch: true
	},
	{
		entry: path.resolve(__dirname, "./index2")
	}
];
