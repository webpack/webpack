const path = require("path");

module.exports = {
    entry: {
		main: "./example"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "output.js",
	},
	stats: "verbose"
};
