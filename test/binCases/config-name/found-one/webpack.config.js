var path = require("path");

module.exports = [
	{
		name: "foo",
		entry: path.resolve(__dirname, "./index")
	},
	{
		name: "bar",
		entry: path.resolve(__dirname, "./index2")
	}
];
